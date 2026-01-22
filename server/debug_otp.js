console.log("--- DEBUG START ---");
try {
    const lib = require('otplib');
    console.log("Library found. Type:", typeof lib);
    console.log("Keys available:", Object.keys(lib));

    if (lib.authenticator) {
        console.log("SUCCESS: authenticator is available directly.");
    } else if (lib.default && lib.default.authenticator) {
        console.log("SUCCESS: authenticator is inside .default");
    } else {
        console.log("FAILURE: authenticator is missing.");
    }
} catch (e) {
    console.log("ERROR: Could not require('otplib').");
    console.log(e.message);
}
console.log("--- DEBUG END ---");