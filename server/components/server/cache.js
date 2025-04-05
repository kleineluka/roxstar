const fs = require("fs");
const path = require("path");
const { create } = require("xmlbuilder");
const pretty = require("../utils/pretty.js");

const cache_dir = path.resolve(__dirname, "../../cache");
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
    for (let i = 0; i < cache_files.length; i++) {
        if (!fs.existsSync(path.resolve(cache_dir, cache_files[i]))) {
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
 * Creates all necessary cache files.
 **/
function initialise() {
    clear_cache();
    generate_alphabetical_moshlings();
    generate_minified_moshlings();
    if (verify_cache()) {
        pretty.print("Cache files have been generated.", 'CACHE');
    } else {
        pretty.error("Cache files could not be generated.");
    }
}

module.exports = {
    initialise,
};