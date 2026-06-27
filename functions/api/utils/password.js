// functions/api/utils/password.js

export async function hashPassword(password, salt = null) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Generate salt random 32 bytes jika tidak diberikan
    const saltBuffer = salt ?
        hexToBytes(salt) :  // ← PERBAIKAN: convert hex ke bytes
        crypto.getRandomValues(new Uint8Array(32));

    const key = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: saltBuffer,
            iterations: 100000,
            hash: 'SHA-256'
        },
        key,
        256
    );

    const derivedArray = Array.from(new Uint8Array(derivedBits));
    const derivedHex = derivedArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const saltHex = Array.from(saltBuffer).map(b => b.toString(16).padStart(2, '0')).join('');

    return `pbkdf2_sha256$100000$${saltHex}$${derivedHex}`;
}

// ✅ FUNGSI BARU: Convert hex string ke Uint8Array
function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

export async function verifyPassword(password, storedHash) {
    try {
        console.log('🔍 Verifying password...');
        console.log('   Stored hash length:', storedHash.length);

        // Format baru: PBKDF2
        const parts = storedHash.split('$');
        if (parts.length === 4 && parts[0] === 'pbkdf2_sha256') {
            console.log('✅ Detected PBKDF2 format');
            const [, , saltHex, expectedHash] = parts;

            // ✅ PERBAIKAN: Convert salt hex ke bytes dengan benar
            const saltBuffer = hexToBytes(saltHex);

            const computedHash = await hashPassword(password, saltHex);
            const computedParts = computedHash.split('$');
            const computedHashPart = computedParts[3];

            const match = computedHashPart === expectedHash;
            console.log('   Match:', match);
            return match;
        }

        // Format lama: SHA-256 plain (64 hex characters)
        if (storedHash.length === 64 && /^[a-f0-9]+$/i.test(storedHash)) {
            console.log('✅ Detected legacy SHA-256 format');

            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            const match = computedHash.toLowerCase() === storedHash.toLowerCase();
            console.log('   Match:', match);
            return match;
        }

        console.warn('⚠️  Unknown hash format');
        return false;

    } catch (error) {
        console.error('❌ Error in verifyPassword:', error);
        return false;
    }
}

export async function needsPasswordUpgrade(storedHash) {
    const parts = storedHash.split('$');
    return !(parts.length === 4 && parts[0] === 'pbkdf2_sha256');
}

export async function upgradePasswordHash(password) {
    return await hashPassword(password);
}