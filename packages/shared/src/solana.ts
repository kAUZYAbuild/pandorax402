import {
  Connection, PublicKey, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync, createTransferInstruction } from "@solana/spl-token";

export const rpc = () => new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com", "confirmed");
export const LAMPORTS_PER_SOL = 1_000_000_000;

export function keypairFromEnv(secret: string | undefined): Keypair {
  if (!secret) throw new Error("Missing secret key env");
  const arr = JSON.parse(secret);
  return Keypair.fromSecretKey(Uint8Array.from(arr));
}

export async function transferSOL(payer: Keypair, to: PublicKey, lamports: number): Promise<string> {
  const conn = rpc();
  const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: to, lamports }));
  return await sendAndConfirmTransaction(conn, tx, [payer], { commitment: "confirmed" });
}

export async function transferUSDC(payer: Keypair, toOwner: PublicKey, mint: PublicKey, amount: bigint): Promise<string> {
  const fromAta = getAssociatedTokenAddressSync(mint, payer.publicKey);
  const toAta = getAssociatedTokenAddressSync(mint, toOwner);
  const ix = createTransferInstruction(fromAta, toAta, payer.publicKey, Number(amount));
  const conn = rpc();
  const tx = new Transaction().add(ix);
  return await sendAndConfirmTransaction(conn, tx, [payer], { commitment: "confirmed" });
}

export type VerifyUSDCParams = {
  signature: string;
  recipientOwner: PublicKey;
  mint: PublicKey;
  minAmount: bigint;
};

export async function verifyUSDC({ signature, recipientOwner, mint, minAmount }: VerifyUSDCParams): Promise<bigint | null> {
  const conn = rpc();
  const tx = await conn.getTransaction(signature, { maxSupportedTransactionVersion: 0 });
  if (!tx || !tx.meta) return null;
  const pre = tx.meta.preTokenBalances?.find(b => b.mint === mint.toBase58() && b.owner === recipientOwner.toBase58());
  const post = tx.meta.postTokenBalances?.find(b => b.mint === mint.toBase58() && b.owner === recipientOwner.toBase58());
  const preUi = pre ? BigInt(pre.uiTokenAmount.amount) : 0n;
  const postUi = post ? BigInt(post.uiTokenAmount.amount) : 0n;
  const delta = postUi - preUi;
  if (delta < minAmount) return null;
  const recipientAta = getAssociatedTokenAddressSync(mint, recipientOwner);
  const idx = tx.transaction.message.staticAccountKeys.findIndex(k => k.equals(recipientAta));
  if (idx === -1) return null;
  return delta;
}

export async function verifySOL(signature: string, recipient: PublicKey, minLamports: bigint): Promise<bigint | null> {
  const conn = rpc();
  const tx = await conn.getTransaction(signature, { maxSupportedTransactionVersion: 0 });
  if (!tx || !tx.meta) return null;
  const idx = tx.transaction.message.staticAccountKeys.findIndex(k => k.equals(recipient));
  if (idx === -1) return null;
  const pre = BigInt(tx.meta.preBalances[idx] ?? 0);
  const post = BigInt(tx.meta.postBalances[idx] ?? 0);
  const delta = post - pre;
  return delta >= minLamports ? delta : null;
}
