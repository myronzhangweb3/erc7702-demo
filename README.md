# ERC7702 demo

## Feature
- [x] Batch Transactions
- [x] Gas Sponsorship
- [ ] Limited Access Delegation
- [ ] Wallet Recovery

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

send native token tx hash: 0x16d5a340696555c5720fd20f574f66a9efbe80870fa038209fb1f397a52ae37c

### ERC20 Token

To send a transaction using the deployed contract, run:

```bash
npm run send:erc20
```

You will receive the following transaction hashes:

send erc20 tx hash: 0xd0c53a86e2f4ee09fc0379752057b929a7ba15e7212804365d6a3a09dd6c0328

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Feel free to submit issues or pull requests if you want to contribute to this repository.