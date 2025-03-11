# ERC7702 demo

## Feature
- [x] execute code for EOA account

## Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/myronzhangweb3/erc7702-demo.git
   cd erc7702-demo
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up your environment variables:**

   Create a `.env` file in the root directory of the project and set params.
   ```bash
   cp .env.example .env
   ```

## Deployment

To deploy Test ERC20:

```bash
npm run deploy:erc20
```

set the `ERC20_TOKEN_ADDRESS` variable to `.env` file:

```plaintext
ERC20_TOKEN_ADDRESS=your_contract_address_here
```

Mint token to tx account:

```bash
npm run mint:erc20
```

To deploy the Batch Call Delegation contract, run the following command:

```bash
npm run deploy:batchcall
```

set the `BATCH_CALL_DELEGATION_CONTRACT_ADDRESS` variable to `.env` file:

```plaintext
BATCH_CALL_DELEGATION_CONTRACT_ADDRESS=your_contract_address_here
```

## Sending Transactions

### Native Token

First, you need to send 0.1 ETH to the address corresponding to `TX_ACCOUNT_PRIVATE_KEY`.

To send a transaction using the deployed contract, run:

```bash
npm run send:native
```

You will receive the following transaction hashes:

- **Contract Write Hash:** `0x9e7ff257c22532222a05f8df529275498455cecead2b875aeb92c8fe2b502217`
- **Send Transaction Hash:** `0xed2e25a921695148d185e9a0bffb27c3cbd2be88b7e67f8e60b6feee8f13bc4e`

### ERC20 Token

To send a transaction using the deployed contract, run:

```bash
npm run send:erc20
```

You will receive the following transaction hashes:

- **Contract Write Hash:** `0x9e7ff257c22532222a05f8df529275498455cecead2b875aeb92c8fe2b502217`
- **Send Transaction Hash:** `0xed2e25a921695148d185e9a0bffb27c3cbd2be88b7e67f8e60b6feee8f13bc4e`


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Feel free to submit issues or pull requests if you want to contribute to this repository.