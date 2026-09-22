import paramiko, time, sys
sys.stdout.reconfigure(encoding='utf-8', errors='ignore')
host="187.127.44.130"
user="root"
pwd="CoderMaster2026"
path="/www/wwwroot/claudiasite"
project="claudiasite_site_10215"
c=paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(host, username=user, password=pwd, timeout=15)
print("SSH connected", flush=True)
def exec(cmd, timeout=800):
    print(f"\n>>> {cmd}", flush=True)
    stdin, stdout, stderr = c.exec_command(cmd, timeout=timeout)
    out=b""
    err=b""
    while not stdout.channel.exit_status_ready():
        time.sleep(2)
        if stdout.channel.recv_ready():
            out+=stdout.channel.recv(8192)
        if stderr.channel.recv_ready():
            err+=stderr.channel.recv_stderr(8192)
    while stdout.channel.recv_ready():
        out+=stdout.channel.recv(8192)
    while stderr.channel.recv_ready():
        err+=stderr.channel.recv_stderr(8192)
    out_s=out.decode('utf-8', errors='ignore')
    err_s=err.decode('utf-8', errors='ignore')
    code=stdout.channel.recv_exit_status()
    print(out_s[-6000:], flush=True)
    if err_s:
        print("ERR:", err_s[-2000:], flush=True)
    print(f"exit:{code}", flush=True)
    return out_s, err_s, code

exec(f"cd {path} && git fetch origin", timeout=60)
exec(f"cd {path} && git reset --hard origin/main", timeout=30)
exec(f"cd {path} && git log --oneline -3", timeout=20)
exec(f"cd {path} && docker compose -p {project} build --no-cache web 2>&1 | tail -n 120", timeout=800)
exec(f"cd {path} && docker compose -p {project} up -d web 2>&1 | tail -n 50", timeout=120)
exec("docker ps --format '{{.Names}} {{.Status}}' | grep claudiasite", timeout=20)
c.close()
print("DONE", flush=True)
