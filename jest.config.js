module.exports = {
  transform: {'^.+\\.ts?$': 'ts-jest'},
  testEnvironment: 'node',
  testRegex: '/test/.*_test\\.ts$',
  testPathIgnorePatterns: ['/scraps/'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
};
