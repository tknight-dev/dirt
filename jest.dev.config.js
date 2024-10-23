module.exports = {
    rootDir: 'src',
    transform: {
        '.(ts|tsx)': [
            'ts-jest', {
                tsConfig: 'tsconfig.dev.json',
            },
        ],
        '^.+.tsx?$': [
            'ts-jest', {},
        ],
    },
}