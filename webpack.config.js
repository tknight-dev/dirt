const path = require('path');

module.exports = {
    entry: './dist/working/dirt.js',
    module: { },
    output: {
        filename: 'dirt.js',
        publicPath: ''
    },
    plugins: [],
    resolve: {},
    stats: 'errors-only'
};