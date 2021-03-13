module.exports = {
  apps: [
    {
      name: 'muffin-server',
      instances: 1,
      maxMemoryRestart: '512M',
      script: 'node',
      args: './src/index.js',
      watch: true,
    },
  ],
};
