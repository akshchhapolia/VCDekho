#!/usr/bin/env node
require('../lib/directory-server').writeDirectoryIndexFiles();
console.log('wrote public/dir-index/people.json and funds.json');
