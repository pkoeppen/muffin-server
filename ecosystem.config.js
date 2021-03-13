module.exports = {
  apps: [
    {
      name: 'muffin-server',
      exec_mode: 'cluster',
      instances: 1,
      maxMemoryRestart: '512M',
      script: './src/index.js',
      watch: true,
    },
  ],
};
