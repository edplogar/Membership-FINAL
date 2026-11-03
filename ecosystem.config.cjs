// PM2 Ecosystem Configuration for Lombok Garden Hotel on NevaCloud VPS
// Penggunaan: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'lombok-crm',
      script: 'server.ts',
      interpreter: 'tsx',
      cwd: './',
      instances: 'max', // Memanfaatkan seluruh core vCPU pada paket NevaCloud
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      kill_timeout: 4000,
      listen_timeout: 8000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      error_file: './logs/pm2-err.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
