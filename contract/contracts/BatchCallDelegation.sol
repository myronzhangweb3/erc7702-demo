// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC7821} from "@openzeppelin/contracts/account/extensions/draft-ERC7821.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title BatchCallDelegation
 * @notice EIP-7702 委托合约，基于 OpenZeppelin ERC-7821 标准最小批量执行器。
 *         支持两种执行路径：
 *         1. execute()         — EOA 自己提交（msg.sender == address(this)）
 *         2. executeWithSig()  — 任意 Gas 代付方提交，携带 EOA 所有者的 EIP-712 签名
 *
 * 安全模型：
 * - execute():        继承 ERC-7821 默认鉴权：msg.sender == address(this)
 * - executeWithSig(): 验证签名者 == address(this)，并通过递增 nonce 防止重放攻击
 *                     验证通过后自调用 execute()，使 msg.sender == address(this)
 *
 * 调用方式：
 * - mode:          BATCH_EXECUTION_MODE（见下方常量）
 * - executionData: abi.encode(Execution[])
 *                  其中 Execution = (address target, uint256 value, bytes callData)
 */
contract BatchCallDelegation is ERC7821, EIP712 {
    /// @notice ERC-7821 单批次执行模式（ERC-7579 callType=0x01, execType=0x00）
    bytes32 public constant BATCH_EXECUTION_MODE =
        0x0100000000000000000000000000000000000000000000000000000000000000;

    /// @dev EIP-712 类型哈希
    bytes32 private constant EXECUTE_TYPEHASH =
        keccak256("Execute(bytes32 mode,bytes32 executionDataHash,uint256 nonce)");

    /// @notice 用于 executeWithSig 的防重放 nonce（存储在 EOA 的 storage slot）
    uint256 public nonce;

    constructor() EIP712("BatchCallDelegation", "1") {}

    /**
     * @notice 支持 Gas 代付的批量执行。
     *         任意地址均可提交，但必须携带 EOA 所有者对 (mode, executionDataHash, nonce) 的 EIP-712 签名。
     * @param mode          执行模式（必须为 BATCH_EXECUTION_MODE）
     * @param executionData abi.encode(Execution[])，其中 Execution = (address, uint256, bytes)
     * @param signature     EOA 所有者的 EIP-712 签名（65 字节）
     */
    function executeWithSig(
        bytes32 mode,
        bytes calldata executionData,
        bytes calldata signature
    ) external payable {
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
            EXECUTE_TYPEHASH,
            mode,
            keccak256(executionData),
            nonce++
        )));

        address signer = ECDSA.recover(digest, signature);
        require(signer == address(this), "AccountUnauthorized");

        // 自调用使 msg.sender == address(this)，通过 ERC-7821 的 _canExecute 检查
        (bool success, bytes memory result) = address(this).call{value: msg.value}(
            abi.encodeWithSelector(this.execute.selector, mode, executionData)
        );
        if (!success) {
            assembly { revert(add(result, 32), mload(result)) }
        }
    }

    receive() external payable {}
}
