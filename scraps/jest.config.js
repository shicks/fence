module.exports = {
  transform: {'^.+\\.ts?$': 'ts-jest'},
  testEnvironment: 'node',
  testRegex: '/test/.*_test\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
};
