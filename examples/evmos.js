// How to interact with an EVM contract in a Skip bundle

import { SkipBundleClient } from '@skip-mev/skipjs'
import ethers from 'ethers'
import fs from 'fs'

const MNEMONIC = "MNEMONIC"
const SENTINEL_RPC_ENDPOINT = "SENTINEL_RPC_ENDPOINT"

// Testnet RPC
const provider = new ethers.providers.JsonRpcProvider("https://eth.bd.evmos.dev:8545");

// EVM Contract info
const bytecode = fs.readFileSync('storage.bin').toString();
const abi = JSON.parse(fs.readFileSync('storage.abi').toString());

// Get eth account from mnemonic
const ethwallet = ethers.Wallet.fromMnemonic(trader1.mnemonic);
const account = ethwallet.connect(provider);

// Make contract instance
const myContract = new ethers.ContractFactory(abi, bytecode, account);
const contractInstance = new ethers.Contract("CONTRACT ADDRESS", abi, account);

// Create the unsigned ethers transaction (replace "function" with contract function, populate gasLimit, gasPrice, nonce as appropriate)
const unsignedTx = await contractInstance.populateTransaction.function({gasLimit: 50000, gasPrice: 15000000, nonce: 0});
// Set the chainID according to evmos, this is using testnet
unsignedTx.chainId = 9000

// Sign the transaction
const signedTx = await account.signTransaction(unsignedTx);

// Convert the 0x-prefixed signedTx from hex-encoded to base64-encoded
const b64Tx = Buffer.from(signedTx.slice(2), 'hex').toString('base64');

// Provide any other txs in the bundle, and a private key to sign the bundle
const skipBundleClient = new SkipBundleClient(SENTINEL_RPC_ENDPOINT);
const signedBundle = await skipBundleClient.signBundle([b64Tx, otherTx], privKey);

// Send the bundle to the sentinel
const sendBundle = skipBundleClient.sendBundle(signedBundle, 0, true).then((res) => {
  console.log(res);
})
