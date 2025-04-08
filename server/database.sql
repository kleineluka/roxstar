-- SECTION: LOG TABLES

-- staff log table
CREATE TABLE IF NOT EXISTS logs_staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin TEXT NOT NULL,
    payload TEXT NOT NULL,
    date INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- puzzle log table
CREATE TABLE IF NOT EXISTS logs_puzzle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    puzzle_id INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    incorrect_answers INTEGER NOT NULL DEFAULT 0,
    date INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- ratings log table
CREATE TABLE IF NOT EXISTS logs_rate (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    rate_visit_user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    rating REAL DEFAULT NULL,
    fingerprint TEXT DEFAULT NULL,
    date INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- secret codes log table
CREATE TABLE IF NOT EXISTS log_secret_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    date INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- SECTION: USER TABLES

-- user table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    username_history TEXT NOT NULL DEFAULT '[]',
    monster_name TEXT NOT NULL,
    password TEXT NOT NULL,
    session_key TEXT DEFAULT NULL, -- for short term login
    remember_me TEXT DEFAULT NULL, -- for long term login
    register_ip TEXT NOT NULL,
    last_ip TEXT DEFAULT NULL,
    activation_status TEXT NOT NULL DEFAULT 'needsActivation',
    staff INTEGER NOT NULL DEFAULT 0,
    gender TEXT NOT NULL DEFAULT 'm',
    birthday INTEGER DEFAULT NULL,
    monster TEXT NOT NULL,
    country TEXT,
    rocks INTEGER NOT NULL DEFAULT 200,
    rocks_today INTEGER NOT NULL DEFAULT 5000,
    level INTEGER NOT NULL DEFAULT 1,
    levels_today INTEGER NOT NULL DEFAULT 5000,
    happiness INTEGER NOT NULL DEFAULT 700,
    health INTEGER NOT NULL DEFAULT 700,
    primary_colour INTEGER NOT NULL,
    secondary_colour INTEGER NOT NULL,
    views INTEGER NOT NULL DEFAULT 0,
    medals TEXT NOT NULL DEFAULT '[0]',
    colorama TEXT NOT NULL DEFAULT '[]',
    profile TEXT NOT NULL DEFAULT '[0,0,0,0,0]',
    dressup_prefix TEXT NOT NULL DEFAULT '',
    settings TEXT NOT NULL DEFAULT '[1,3,3,3,3,3,3,3]',
    unvisited_location_types TEXT NOT NULL DEFAULT 'shop,street,gameroom,friendroom,sellbackshop,dressuproom,dressupshop,garden,seedshop,colorama,marketplace,moshlingzoo,adoption,giftshop,roomshop,printworkshop,arcade,missionsGateway,missionsHQ,tutorial_room',
    invisible_for_presence INTEGER NOT NULL DEFAULT 0,
    rox_trees INTEGER NOT NULL DEFAULT 10,
    has_claimed_daily INTEGER NOT NULL DEFAULT 0,
    garden TEXT NOT NULL DEFAULT '0~black~-1~60000~60000~0|1~black~-1~60000~60000~0|2~black~-1~60000~60000~0',
    creation_date INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    last_active INTEGER DEFAULT NULL,
    house_style TEXT NOT NULL DEFAULT 'default'
);

-- clothing inventory table
CREATE TABLE IF NOT EXISTS clothes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    date INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- dressup inventory table
CREATE TABLE IF NOT EXISTS dressup (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    z REAL NOT NULL,
    xscale REAL NOT NULL,
    yscale REAL NOT NULL,
    rotation REAL NOT NULL,
    layer INTEGER NOT NULL,
    boneName TEXT NOT NULL, -- keep camel case per original game
    direction TEXT NOT NULL,
    date INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- items inventory table
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    z REAL NOT NULL,
    date INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- moshlings table
CREATE TABLE IF NOT EXISTS moshlings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    srcId INTEGER NOT NULL,
    in_room TEXT NOT NULL, -- may be best suited as something else, will see
    date INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- seeds table
CREATE TABLE IF NOT EXISTS seeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    date INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- missions table
CREATE TABLE IF NOT EXISTS missions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL, 
    mission_uuid TEXT NOT NULL,
    has_collected_epics TEXT NOT NULL, -- may be best for integer 0/1?
    date INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- SECTION: SOCIAL TABLES

-- bff news feed table
CREATE TABLE IF NOT EXISTS bff_news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    value TEXT NOT NULL,
    date INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- user friends table
CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    friend_user_id INTEGER NOT NULL,
    bff TEXT NOT NULL, -- may be best for integer 0/1?
    status TEXT NOT NULL,
    message TEXT NOT NULL,
    date INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- message board table
CREATE TABLE IF NOT EXISTS message_board (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender INTEGER NOT NULL,
    reciever INTEGER NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL,
    reported INTEGER DEFAULT NULL,
    watermark INTEGER NOT NULL,
    colour INTEGER NOT NULL,
    date INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- gifts table
CREATE TABLE IF NOT EXISTS gifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender INTEGER NOT NULL,
    reciever INTEGER NOT NULL,
    message TEXT NOT NULL,
    gift_id INTEGER NOT NULL,
    has_opened INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    reported INTEGER DEFAULT NULL,
    location_id INTEGER NOT NULL,
    date INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- mystery gifts table
CREATE TABLE IF NOT EXISTS mystery_gifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender INTEGER NOT NULL,
    reciever INTEGER NOT NULL,
    gift_uuid TEXT NOT NULL,
    has_opened INTEGER NOT NULL DEFAULT 0,
    new INTEGER NOT NULL DEFAULT 1,
    date INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- SECTION: OTHER TABLES

-- minigame highscores table
CREATE TABLE IF NOT EXISTS minigames_highscores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    gameid INTEGER NOT NULL,
    score INTEGER DEFAULT NULL,
    hash TEXT NOT NULL,
    date INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- secret codes table
CREATE TABLE IF NOT EXISTS secret_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status INTEGER NOT NULL DEFAULT 0,
    type TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE, -- ensure unique
    prize TEXT NOT NULL,
    is_public INTEGER NOT NULL DEFAULT 0,
    is_unlimited_use INTEGER NOT NULL DEFAULT 0 
);