// Jey: Import necessary modules for Firebase Functions and encryption
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");

// Jey: Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Jey: IMPORTANT: Replace this with your own secret, securely stored key.
// NEVER hardcode a key like this in a real production environment.
// Use a service like Google Secret Manager for production.
const SECRET_KEY = functions.config().env.SECRET_KEY ||
  "your-super-secret-key-of-32-chars";
const IV_LENGTH = 16;
const ALGORITHM = "aes-256-cbc";

/**
 * Encrypts a plaintext string using AES-256-CBC.
 * @param {string} text The plaintext string to encrypt.
 * @returns {string} The encrypted string.
 */
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(SECRET_KEY, "utf8"),
      iv,
  );
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypts an encrypted string.
 * @param {string} text The encrypted string to decrypt.
 * @returns {string} The plaintext string.
 */
function decrypt(text) {
  const parts = text.split(":");
  const iv = Buffer.from(parts.shift(), "hex");
  const encryptedText = Buffer.from(parts.join(":"), "hex");
  const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(SECRET_KEY, "utf8"),
      iv,
  );
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// Jey: Cloud Function to add a gate code and encrypt it.
// This function is called from the client using HTTPS.
exports.addGateCode = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated",
        "The function must be called while authenticated.");
  }

  const { location, code, notes, imageUrl, dspName, companyId } = data;

  if (!location || !code) {
    throw new functions.https.HttpsError("invalid-argument",
        "Location and code are required.");
  }

  try {
    const encryptedCode = encrypt(code);

    const docRef = await db.collection("gateCodes").add({
      location: location,
      encryptedCode: encryptedCode,
      notes: notes,
      imageUrl: imageUrl,
      dspName: dspName,
      companyId: companyId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      addedByUid: context.auth.uid,
    });

    return {
      success: true,
      message: "Gate code added successfully!",
      id: docRef.id,
    };
  } catch (error) {
    console.error("Jey: Error in addGateCode function:", error);
    throw new functions.https.HttpsError("internal",
        "An error occurred while adding the gate code.");
  }
});

// Jey: Cloud Function to retrieve and decrypt a gate code.
// This is for fetching a specific gate code's details.
exports.getDecryptedGateCode = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated",
        "The function must be called while authenticated.");
  }

  const { docId } = data;
  if (!docId) {
    throw new functions.https.HttpsError("invalid-argument",
        "Document ID is required.");
  }

  try {
    const gateCodeDoc = await db.collection("gateCodes").doc(docId).get();

    if (!gateCodeDoc.exists) {
      throw new functions.https.HttpsError("not-found",
          "Gate code not found.");
    }

    const docData = gateCodeDoc.data();
    if (!docData.encryptedCode) {
      throw new functions.https.HttpsError("not-found",
          "Encrypted code not found.");
    }

    const decryptedCode = decrypt(docData.encryptedCode);
    
    // Jey: Return the full document data, with the decrypted code instead
    // of the encrypted one.
    return { ...docData, code: decryptedCode };
  } catch (error) {
    console.error("Jey: Error in getDecryptedGateCode function:", error);
    throw new functions.https.HttpsError("internal",
        "An error occurred while retrieving the gate code.");
  }
});