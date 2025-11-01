module.exports = {
  apps: [
    {
      name: 'mores',
      script: 'dist/bot.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=256'
      }
    }
  ]
};
