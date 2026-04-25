const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { create } = require("xmlbuilder");
const pretty = require("../utils/pretty.js");
const pkg = require("../../package.json");

const cache_dir = path.resolve(__dirname, "../../cache");
const resources_dir = path.resolve(__dirname, "../../resources");
const cache_files = [
    "moshlings_alphabetical.json",
    "moshlings_minified.xml"
];

/**
 * Clears the cache folder and creates it again.
 **/
function clear_cache() {
    if (fs.existsSync(cache_dir)) {
        fs.rmSync(cache_dir, { recursive: true });
    }
    fs.mkdirSync(cache_dir);
}

/**
 * Verifies that the cache files exist.
 **/
function verify_cache() {
    const files_to_check = [...cache_files];
    if (global.config_server['resources-manifest']) {
        files_to_check.push('resources_manifest.json');
    }
    for (let i = 0; i < files_to_check.length; i++) {
        if (!fs.existsSync(path.resolve(cache_dir, files_to_check[i]))) {
            return false;
        }
    }
    return true;
}

/**
 * Sorts the moshlings.json file alphabetically by name and writes it to the cache folder.
 * This is to avoid sorting it every time we need to use it.
 **/
function generate_alphabetical_moshlings() {
    pretty.print("Sorting moshlings.json alphabetically.", 'CACHE');
    // sort the moshlings.json file to a new file
    let sorted_moshlings = Object.values(global.storage_moshlings);
    sorted_moshlings.sort((a, b) => a.name.localeCompare(b.name));
    // write the sorted moshlings.json file to the cache folder as moshlings_alphabetical.json
    fs.writeFileSync(path.resolve(cache_dir, "moshlings_alphabetical.json"), JSON.stringify(sorted_moshlings, null, 4));
}

/**
 * Generates the moshlings_minified.xml file from the moshlings_alphabetical.json file.
 * This is to avoid parsing the json file every time we need to use it.
 **/
function generate_minified_moshlings() {
    pretty.print("Converting portions of moshlings_alphabetical.json to moshlings_minified.xml.", 'CACHE');
    // read the moshlings_alphabetical.json file
    let moshlings_json = JSON.parse(fs.readFileSync(path.resolve(cache_dir, "moshlings_alphabetical.json")));
    // gather data for the xml
    let moshling_data = [];
    Object.keys(moshlings_json).forEach(key => {
        const moshling = moshlings_json[key];
        moshling_data.push({
            '@path': moshling.asset,
            '@available': 'true',
            '@id': key,
            '@name': moshling.name
        });
    });
    // construct the xml
    let xml = create({
        moshlings: {
            moshling: moshling_data
        }
    }).end({ pretty: global.config_server['pretty-print-replies'] });
    // SHORT AND HACKY, to-do: replace with proper xml configuration
    xml = xml.replace('<?xml version="1.0"?>', '<?xml version="1.0" encoding="UTF-8"?>');
    // write the xml to the cache folder as moshlings_minified.xml
    fs.writeFileSync(path.resolve(cache_dir, "moshlings_minified.xml"), xml);
}

/**
 * Recursively walks the resources directory, hashes every file with SHA-256,
 * and writes a manifest JSON to the cache folder.
 * The manifest maps each relative file path (forward-slash separated) to its hex digest.
 **/
function generate_resources_manifest() {
    pretty.print("Generating resources manifest, please be patient! Hashing all files in resources/...", 'CACHE');
    const files = {};

    function walk(dir, base) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            const rel  = (base ? base + '/' : '') + entry.name;
            if (entry.isDirectory()) {
                walk(full, rel);
            } else {
                files[rel] = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
            }
        }
    }

    walk(resources_dir, '');

    const sorted_files = Object.fromEntries(Object.keys(files).sort().map(k => [k, files[k]]));
    const checksum = crypto.createHash('sha256').update(JSON.stringify(sorted_files)).digest('hex');
    const manifest = { generated: new Date().toISOString(), server_version: pkg.version, checksum, files: sorted_files };
    fs.writeFileSync(path.resolve(cache_dir, 'resources_manifest.json'), JSON.stringify(manifest));
    pretty.print(`Resources manifest generated with ${Object.keys(files).length} file(s). Checksum: ${checksum}`, 'CACHE');
}

/**
 * Creates all necessary cache files.
 **/
function initialise() {
    clear_cache();
    generate_alphabetical_moshlings();
    generate_minified_moshlings();
    if (global.config_server['resources-manifest']) {
        generate_resources_manifest();
    }
    if (verify_cache()) {
        pretty.print("Cache files have been generated.", 'CACHE');
    } else {
        pretty.error("Cache files could not be generated.");
    }
}

module.exports = {
    initialise,
};