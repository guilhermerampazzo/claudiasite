import paramiko, time
host="187.127.44.130"
user="root"
pwd="CoderMaster2026"
path="/www/wwwroot/claudiasite"
project="claudiasite_site_10215"

c=paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(host, username=user, password=pwd, timeout=15)
print("SSH connected")

def exec(cmd, timeout=600):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = c.exec_command(cmd, timeout=timeout)
    # wait for completion with polling
    while not stdout.channel.exit_status_ready():
        time.sleep(1)
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    code = stdout.channel.recv_exit_status()
    print(out[-8000:])  # last 8k
    if err:
        print("ERR:", err[-2000:])
    print(f"exit:{code}")
    return out, err, code

# 1. Git fetch and reset
exec(f"cd {path} && git fetch origin")
exec(f"cd {path} && git status --porcelain")
exec(f"cd {path} && git reset --hard origin/main")
exec(f"cd {path} && git log --oneline -3")

# 2. Build
exec(f"cd {path} && docker compose -p {project} build web", timeout=600)

# 3. Up
exec(f"cd {path} && docker compose -p {project} up -d web", timeout=120)

# 4. Check status
exec("docker ps --format '{{.Names}} {{.Status}} {{.Ports}}' | grep claudiasite", timeout=30)
exec(f"docker logs {project}-web-1 --tail 30 2>&1 | tail -n 50", timeout=30)
exec(f"curl -s http://localhost:10215/papeis-de-parede 2>&1 | head -n 5", timeout=30)
exec("ls /www/wwwroot/ | head -n 20", timeout=10)

c.close()
print("DONE")
