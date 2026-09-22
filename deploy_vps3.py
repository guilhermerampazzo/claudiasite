import paramiko
host="187.127.44.130"
user="root"
pwd="CoderMaster2026"
c=paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(host, username=user, password=pwd, timeout=15)
def exec(cmd):
    print(f"\n>>> {cmd}")
    stdin,stdout,stderr=c.exec_command(cmd, timeout=30)
    out=stdout.read().decode('utf-8', errors='ignore')
    err=stderr.read().decode('utf-8', errors='ignore')
    print(out)
    if err: print("ERR:",err)
    return out
exec("docker inspect claudiasite_site_10215-web-1 --format '{{json .Config.Labels}}' 2>&1 | python3 -m json.tool 2>&1 | head -n 50")
exec("docker inspect claudiasite_site_10215-web-1 --format '{{json .HostConfig}}' 2>&1 | head -n 20")
exec("cat /www/wwwroot/claudiasite/.env")
exec("docker compose ls 2>&1 | head -n 30")
exec("docker ps --format '{{.Names}} {{.Image}} {{.Ports}}' 2>&1 | head -n 20")
exec("ls -la /www/wwwroot/claudiasite/*.yml /www/wwwroot/claudiasite/*.yaml 2>&1 | head -n 20")
c.close()
