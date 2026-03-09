module.exports = {
  apps: [{
    name: "storyforgeai",
    script: "npm",
    args: "start -- -p 8081",
    cwd: "/var/www/storyforgeai",
    env_file: "/var/www/storyforgeai/.env",
    interpreter: "none"
  }]
}
