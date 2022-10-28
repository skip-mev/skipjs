import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx.js'
import { OfflineSigner } from '@cosmjs/proto-signing'
import fetch from 'node-fetch-commonjs'
import { sha256, Secp256k1 } from '@cosmjs/crypto'
import { encodeSecp256k1Signature } from "@cosmjs/amino"
import  minimal_1 from "protobufjs/minimal.js"

export class SkipBundleClient {
  private sentinelRPCEndpoint: string

  constructor(sentinelRPCEndpoint: string) {
    this.sentinelRPCEndpoint = sentinelRPCEndpoint
  }

  public async sendBundle(bundle: SignedBundle, desiredHeight: number, sync?: boolean) {
      let method = 'broadcast_bundle_async'
      if (sync) {
          method = 'broadcast_bundle_sync'
      }

    // Form request data
    const data = {
        'method': method,
        'params': [bundle.transactions, desiredHeight.toString(), bundle.pubKey, bundle.signature],
        'id': 1
    }

    // Use the web endpoint to send the request
    const response = await fetch(this.sentinelRPCEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })

    return response.json()
  }

  public async signBundle(transactions: Array<TxRaw>, signer: OfflineSigner, signerAddress: string): Promise<SignedBundle> {
    const transactionsToSign = []
    const b64Transactions = []
    for (let transaction of transactions) {
      // Proto-encode tx
      const txBytes = TxRaw.encode(transaction).finish()
      transactionsToSign.push(txBytes)

      // Base64 string encode the proto encoding
      b64Transactions.push(Buffer.from(txBytes).toString('base64'))
    }
    const signedBundle = await helperSignBundle(transactionsToSign, signer, signerAddress);
    return {
        transactions: b64Transactions,
        pubKey: signedBundle.pubKey,
        signature: signedBundle.signature
    }
  }
}

async function helperSignBundle(txs: Uint8Array[], signer: OfflineSigner, signerAddress: string) {
    // @ts-ignore
    const accounts = await signer.getAccountsWithPrivkeys(); 
    const account = accounts.find(({address} : {address:string}) => address === signerAddress)
    if (account === undefined) {
        throw new Error(`No account found for signer address ${signerAddress}`)
    }
    const { privkey, pubkey } = account
    const hashedBundle = sha256(flatten(txs))
    const signature = await Secp256k1.createSignature(hashedBundle, privkey)
    const signatureBytes = new Uint8Array([...signature.r(32), ...signature.s(32)])
    const stdSignature = encodeSecp256k1Signature(pubkey, signatureBytes)
    return {
        signature: stdSignature.signature,
        pubKey: stdSignature.pub_key.value
    }
}

function flatten(arr: Uint8Array[]): Uint8Array {
    let totalLength = arr.reduce((acc, value) => acc + value.length, 0)
    let result = new Uint8Array(totalLength)

    let length = 0;
    for (let a of arr) {
        result.set(a, length)
        length += a.length
    }

    return result
}

export type SignedBundle = {
  transactions: Array<string>
  pubKey: string
  signature: string
}

export default {
  SkipBundleClient,
}
