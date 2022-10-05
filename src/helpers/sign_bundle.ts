import  { Bundle } from "./skip-types/bundle.cjs"
import { sha256, Secp256k1 } from '@cosmjs/crypto'
import { encodeSecp256k1Signature } from "@cosmjs/amino"
import  minimal_1 from  "protobufjs/minimal.js"

async function signBundle(txs: Array<string>, signer: object, signerAddress: string) {
    const accounts = await signer.getAccountsWithPrivkeys(); 
    const account = accounts.find(({address}) => address === signerAddress);
    if (account === undefined) {
        throw new Error(`No account found for signer address ${signerAddress}`);
    }
    // private key is not defined here for some reason
    const {privkey, pubkey } = account;
    const bundle = Bundle.encode({
        txs: txs
    }, minimal_1.Writer.create()).finish()
    const hashedBundle = (0, sha256)(bundle)
    const signature = await Secp256k1.createSignature(hashedBundle, privkey)
    const signatureBytes = new Uint8Array([...signature.r(32), ...signature.s(32)])
    const stdSignature = encodeSecp256k1Signature(pubkey, signatureBytes)
    return {
        signature: stdSignature.signature,
        pubKey: stdSignature.pub_key.value
    }
}
