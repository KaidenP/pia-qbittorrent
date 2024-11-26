import EventEmitter from "node:events"
import child_process from "node:child_process"
import fs from "node:fs/promises"
import * as path from "node:path";

const UID = (process.env.SETUID !== "" && typeof process.env.SETUID === "string")  ? process.env.GID : 1000
const GID = (process.env.SETGID !== "" && typeof process.env.SETGID === "string")  ? process.env.GID : 1000

export default class App extends EventEmitter {
    static iptables = [
        ['-A', 'INPUT', '-p', 'tcp', '-i', 'eth0', '--dport', '8080', '-j', 'ACCEPT']
    ]
    constructor() {
        super();
        this.state = undefined
        this.connected = false
    }
    async start() {
        if (!this.connected) {
            console.log("Not Connected, not starting app")
        }
        if (this.state !== undefined) {
            console.log("App Running, not starting app again")
            return
        }
        console.log("Starting app...")

        //initial config
        try {
            await fs.access('/data/.config')
        } catch (e) {
            for (let path in ['/data/.config', '/data/Downloads', '/data/torrents/added'])
                await fs.mkdir(path, { recursive: true })
            await fs.cp('/app/qBittorrent.conf', '/data/.config/qBittorrent/config/qBittorrent.conf')

            for (const f of await fs.readdir('/data', { recursive: true })) {
                console.log(f)
                const stat = await fs.stat(path.join('/data', f))
                await fs.chown(path.join('/data', f), UID, GID)
                if (stat.isDirectory()) {
                    await fs.chmod(path.join('/data', f), 2775)
                } else {
                    await fs.chmod(path.join('/data', f), 664)
                }
            }
        }

        let cp = child_process.spawn('/usr/bin/qbittorrent-nox', [`--torrenting-port=${this.port}`, '--profile=/data/.config'], {
            uid: UID,
            gid: GID,
        })

        const bufferClear = []
        function bufferedOutput(prefix) {
            let buffer = ''
            bufferClear.push(()=>console.log(prefix, buffer))
            return function (data) {
                buffer += data
                let buf = buffer.split('\n')
                while (buf.length > 0) {
                    console.log(prefix, buf.shift())
                }
                buffer = buf.join('\n')
            }
        }
        cp.stdout.on('data', bufferedOutput('[APP STD]:'))
        cp.stderr.on('data', bufferedOutput('[APP ERR]:'))

        cp.on("close", code => {
            while (bufferClear.pop()()) {}
            this.cleanup()
        })

        this.state = {
            cp
        }
        this.emit('started')
    }

    cleanup() {
        this.state.cp.kill()
        this.state = undefined
        this.emit('stopped')
    }

    async stop() {
        this.state.cp.kill()
    }
}