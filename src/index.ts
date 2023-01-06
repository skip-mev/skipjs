import fetch from 'node-fetch-commonjs'
import { sha256, Secp256k1 } from '@cosmjs/crypto'
import { encodeSecp256k1Signature } from "@cosmjs/amino"

export class SkipBundleClient {
  private sentinelRPCEndpoint: string

  constructor(sentinelRPCEndpoint: string) {
    this.sentinelRPCEndpoint = sentinelRPCEndpoint
  }

  public async sendBundle(bundle: SignedBundle, desiredHeight: number, sync: boolean) {
    let method = 'broadcast_bundle_sync'
    if (sync === false) {
      method = 'broadcast_bundle_async'
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

  public async signBundle(transactions: string[], privKey: Uint8Array): Promise<SignedBundle> {
    const txBuffers = []
    for (let transaction of transactions) {
      txBuffers.push(Buffer.from(transaction, 'base64'))
    }
    const signedBundle = await helperSignBundle(txBuffers, privKey);
    return {
      transactions: transactions,
      pubKey: signedBundle.pubKey,
      signature: signedBundle.signature
    }
  }
}

export class SkipSecureClient {
  private sentinelRPCEndpoint: string

  constructor(sentinelRPCEndpoint: string) {
    this.sentinelRPCEndpoint = sentinelRPCEndpoint
  }

  public async sendSecureTransaction(transaction: string) {
    // Form request data
    const data = {
      'method': 'broadcast_secure_tx',
      'params': [transaction],
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
}

async function helperSignBundle(txs: Uint8Array[], privKey: Uint8Array) {
  const { privkey, pubkey } = await Secp256k1.makeKeypair(privKey)
  const hashedBundle = sha256(flatten(txs))
  const signature = await Secp256k1.createSignature(hashedBundle, privkey)
  const signatureBytes = new Uint8Array([...signature.r(32), ...signature.s(32)])
  const stdSignature = encodeSecp256k1Signature(Secp256k1.compressPubkey(pubkey), signatureBytes)
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
