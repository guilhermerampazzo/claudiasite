import paramiko
host="187.127.44.130"
user="root"
pwd="CoderMaster2026"
client=paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=pwd, timeout=15)
def exec(cmd):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
    out=stdout.read().decode('utf-8', errors='ignore')
    err=stderr.read().decode('utf-8', errors='ignore')
    print(out)
    if err: print("ERR:", err)
    return out

exec("ps aux | grep -E 'node|next|pm2|docker' | grep -v grep | head -n 30")
exec("docker ps 2>&1 | head -n 30")
exec("pm2 list 2>&1 | head -n 50")
exec("pm2 ls 2>&1 | head -n 50")
exec("cat /www/wwwroot/claudiasite/docker-compose.yml")
exec("ls -la /www/wwwroot/claudiasite/.next 2>&1 | head -n 20")
exec("cat /proc/cmdline 2>&1 | head")
exec("systemctl status claudiasite 2>&1 | head -n 20")
exec("ls /www/server/panel/vhost/nginx/*.conf 2>&1 | xargs grep -l claudiasite 2>&1 | head")
client.close()
