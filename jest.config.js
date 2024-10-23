module.exports = {
    rootDir: 'src',
    transform: {
        '.(ts|tsx)': [
            'ts-jest', {
                tsConfig: 'tsconfig.json',
            },
        ],
        '^.+.tsx?$': [
            'ts-jest', {},
        ],
    },
}