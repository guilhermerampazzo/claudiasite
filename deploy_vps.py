import paramiko
import sys

host = "187.127.44.130"
user = "root"
pwd = "CoderMaster2026"
path = "/www/wwwroot/claudiasite"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(host, username=user, password=pwd, timeout=15)
    print("SSH connected")
except Exception as e:
    print(f"SSH connect failed: {e}")
    sys.exit(1)

def exec_cmd(cmd):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    code = stdout.channel.recv_exit_status()
    print(out)
    if err:
        print("ERR:", err)
    print(f"exit: {code}")
    return out, err, code

# Check path
exec_cmd(f"ls -la {path} | head -n 50")
exec_cmd(f"cat {path}/package.json | head -n 20")
exec_cmd(f"cd {path} && git status --porcelain")
exec_cmd(f"cd {path} && git remote -v")
exec_cmd(f"cd {path} && git fetch origin 2>&1 | head -n 20")
exec_cmd(f"cd {path} && git log --oneline -3")
exec_cmd(f"cd {path} && git diff --stat HEAD..origin/main | head -n 30")

# Do not auto pull yet, just show what would change
# List other projects to prove we are not touching them
exec_cmd("ls /www/wwwroot/ | head -n 30")

client.close()
print("done")
