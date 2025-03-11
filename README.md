参考：https://viem.sh/experimental/eip7702

```bash
npx hardhat ignition deploy ignition/modules/BatchCallDelegation.ts --network sepolia_1
```

set contract to `BATCH_CALL_DELEGATION_CONTRACT_ADDRESS` in .evn file

```bash
npm run send-tx
```
result:
contract writes hash: 0x9e7ff257c22532222a05f8df529275498455cecead2b875aeb92c8fe2b502217
send tx hash: 0xed2e25a921695148d185e9a0bffb27c3cbd2be88b7e67f8e60b6feee8f13bc4e



## Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-repo-name.git
   cd your-repo-name
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up your environment variables:**

   Create a `.env` file in the root directory of the project and set the `BATCH_CALL_DELEGATION_CONTRACT_ADDRESS` variable:

   ```plaintext
   BATCH_CALL_DELEGATION_CONTRACT_ADDRESS=your_contract_address_here
   ```

## Deployment

To deploy the Batch Call Delegation contract, run the following command:

```bash
npx hardhat ignition deploy ignition/modules/BatchCallDelegation.ts --network sepolia_1
```

### Transaction Results

Upon successful deployment, you will receive the following transaction hashes:

- **Contract Write Hash:** `0x9e7ff257c22532222a05f8df529275498455cecead2b875aeb92c8fe2b502217`
- **Send Transaction Hash:** `0xed2e25a921695148d185e9a0bffb27c3cbd2be88b7e67f8e60b6feee8f13bc4e`

## Sending Transactions

To send a transaction using the deployed contract, run:

```bash
npm run send-tx
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Feel free to submit issues or pull requests if you want to contribute to this repository.
```

### Notes:
- Replace `your-repo-name` with the actual name of your repository.
- Ensure that the `.env` file and any sensitive information are not included in your repository by adding `.env` to your `.gitignore` file.
- You may want to add more detailed instructions or explanations based on your project’s complexity.