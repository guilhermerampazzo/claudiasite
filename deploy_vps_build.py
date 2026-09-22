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
def exec(cmd, timeout=700):
    print(f"\n>>> {cmd}", flush=True)
    stdin, stdout, stderr = c.exec_command(cmd, timeout=timeout)
    # read incrementally
    out = b""
    err = b""
    # wait
    while not stdout.channel.exit_status_ready():
        time.sleep(2)
        if stdout.channel.recv_ready():
            out += stdout.channel.recv(4096)
        if stderr.channel.recv_ready():
            err += stderr.channel.recv_stderr(4096)
    # drain remaining
    while stdout.channel.recv_ready():
        out += stdout.channel.recv(4096)
    while stderr.channel.recv_ready():
        err += stderr.channel.recv_stderr(4096)
    out_s = out.decode('utf-8', errors='ignore')
    err_s = err.decode('utf-8', errors='ignore')
    code = stdout.channel.recv_exit_status()
    # print last 5000 chars safely
    print(out_s[-5000:], flush=True)
    if err_s:
        print("ERR:", err_s[-2000:], flush=True)
    print(f"exit:{code}", flush=True)
    return out_s, err_s, code

exec(f"cd {path} && docker compose -p {project} build web 2>&1 | tail -n 100", timeout=700)
exec(f"cd {path} && docker compose -p {project} up -d web 2>&1 | tail -n 50", timeout=120)
exec("docker ps --format '{{.Names}} {{.Status}}' | grep claudiasite", timeout=20)
exec(f"docker logs {project}-web-1 --tail 20 2>&1 | tail -n 20", timeout=20)
c.close()
print("DONE", flush=True)
