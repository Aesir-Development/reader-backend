// main.ts

import * as path from 'path';
import * as fs from 'fs';
import chokidar from 'chokidar';
import { Plugin } from './plugin-interface';

// Express
import express from 'express';
const app = express();
const port = 3000;

const pluginDir = path.join(__dirname, 'plugins');
const Plugins: Map<string, Plugin> = new Map();

async function loadPlugin(filePath: string) {
    try {
        const module = await import(filePath);

        let PluginClass;

        if (module.default && typeof module.default === 'function') {
            PluginClass = module.default;
        } else {
            for (const key in module) {
                if (typeof module[key] === 'function') {
                    PluginClass = module[key];
                    break;
                }
            }
        }

        if (!PluginClass) {
            console.error(`No valid Plugin class found in plugin: ${filePath}`);
            return;
        }

        const PluginInstance: Plugin = new PluginClass();
        Plugins.set(filePath, PluginInstance);
        console.log(`Loaded plugin from ${filePath}`);
    } catch (error) {
        console.error(`Failed to load plugin ${filePath}:`, error);
    }
}

function unloadPlugin(filePath: string) {
    if (Plugins.has(filePath)) {
        Plugins.delete(filePath);
        console.log(`Unloaded plugin from ${filePath}`);
    } else {
        console.log(`No plugin found to unload at ${filePath}`);
    }
}

async function reloadPlugins() {
    console.log('Reloading plugins...');
    const pluginFiles = fs.readdirSync(pluginDir).filter(file => file.endsWith('.ts'));

    for (const file of pluginFiles) {
        const pluginPath = path.join(pluginDir, file);
        if (!Plugins.has(pluginPath)) {
            await loadPlugin(pluginPath);
        }
    }
}

// Initial loading of plugins
reloadPlugins();

// Set up directory monitoring
const watcher = chokidar.watch(pluginDir, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true, // don't fire events for existing files on startup
});

watcher
    .on('add', async filePath => {
        if (filePath.endsWith('.ts')) {
            await loadPlugin(filePath);
        }
    })
    .on('change', async filePath => {
        if (filePath.endsWith('.ts')) {
            unloadPlugin(filePath);
            await loadPlugin(filePath);
        }
    })
    .on('unlink', filePath => {
        if (filePath.endsWith('.ts')) {
            unloadPlugin(filePath);
        }
    });


app.get('/', (req, res) => {
    res.send('Hello World!');
})

// TODO - Change plugins key to be the plugin name instead of the full path
app.get('/plugins', (req, res) => {
    const pluginList = Array.from(Plugins.keys());

    for (let i = 0; i < pluginList.length; i++) {
        pluginList[i] = path.basename(pluginList[i]);
    }

    res.json(pluginList);
});

app.get('/:plugin/manhwa/:id', (req, res) => {
    const plugin = Plugins.get(path.join(pluginDir, req.params.plugin));
    if (!plugin) {
        res.status(404).send('Plugin not found');
        return;
    }

    plugin.getManhwaById(req.params.id).then(manwha => {
        res.json(manwha);
    }).catch(error => {
        res.status(500).send('Failed to get manhwa');
    });
})

app.get('/:plugin/search/:name', (req, res) => {
    const plugin = Plugins.get(path.join(pluginDir, req.params.plugin));
    if (!plugin) {
        res.status(404).send('Plugin not found');
        return;
    }

    plugin.getManhwaList(req.params.name).then(manwhas =>
        res.json(manwhas)
    ).catch(error => {
        res.status(500).send('Failed to get manhwa list');
    });
});

app.get('/:plugin/chapter/:url', (req, res) => {
    const plugin = Plugins.get(path.join(pluginDir, req.params.plugin));
    if (!plugin) {
        res.status(404).send('Plugin not found');
        return;
    }

    plugin.getChapterImages(req.params.url).then(images =>
        res.json(images)
    ).catch(error => {
        res.status(500).send('Failed to get chapter images');
    });
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

// Example use of the plugins
function testPlugins() {
    const searchQuery = 'Solo Leveling';
    // Grab the Webtoon plugin if it exists
    const webtoonPlugin = Plugins.get(path.join(pluginDir, 'webtoon.ts'));
    if (!webtoonPlugin) return;

    webtoonPlugin.getManhwaById('2009').then(manwha => {
        console.log(manwha.metadata);
        console.log(manwha.chapters.length);
    }).catch(error => {
        console.error('Failed to get manhwa:', error);
    })
}

