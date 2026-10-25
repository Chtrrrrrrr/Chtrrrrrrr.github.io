class FileSystem {
    constructor() {
        this.root = null;
        this.current = null;
        this.selected = null;
        this.history = [];
        this.historyIndex = -1;
        this.shouldAnimate = true;
    }

    async load(url = 'data/filesystem.json') {
        const response = await fetch(url);
        this.root = await response.json();
        this.current = this.root;
        this.history = [this.root];
        this.historyIndex = 0;
        this.shouldAnimate = true;
    }

    get path() {
        return this.current === this.root ? 'root' : this.current.name;
    }

    get canGoBack() { return this.historyIndex > 0; }
    get canGoForward() { return this.historyIndex < this.history.length - 1; }
    get isAtRoot() { return this.current === this.root; }

    getFilteredChildren(search = '') {
        let items = this.current.children || [];
        if (search) {
            const term = search.toLowerCase();
            items = items.filter(i => i.name.toLowerCase().includes(term));
        }
        items.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'folder' ? -1 : 1;
        });
        return items;
    }

    getStats() {
        const items = this.current.children || [];
        return {
            folders: items.filter(i => i.type === 'folder').length,
            files: items.filter(i => i.type === 'file').length
        };
    }

    findParent(target, current = this.root) {
        if (!current.children) return null;
        for (let child of current.children) {
            if (child === target) return current;
            if (child.type === 'folder') {
                const found = this.findParent(target, child);
                if (found) return found;
            }
        }
        return null;
    }

    enter(folder) {
        this.current = folder;
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(folder);
        this.historyIndex++;
        this.selected = null;
        this.shouldAnimate = true;
    }

    back() {
        if (!this.canGoBack) return false;
        this.historyIndex--;
        this.current = this.history[this.historyIndex];
        this.selected = null;
        this.shouldAnimate = true;
        return true;
    }

    forward() {
        if (!this.canGoForward) return false;
        this.historyIndex++;
        this.current = this.history[this.historyIndex];
        this.selected = null;
        this.shouldAnimate = true;
        return true;
    }

    up() {
        const parent = this.findParent(this.current);
        if (parent) {
            this.enter(parent);
            return true;
        }
        return false;
    }

    home() {
        this.current = this.root;
        this.history = [this.root];
        this.historyIndex = 0;
        this.selected = null;
        this.shouldAnimate = true;
    }

    select(item) {
        this.selected = item;
        this.shouldAnimate = false;
    }

    deselect() {
        this.selected = null;
        this.shouldAnimate = false;
    }

    createFolder(name) {
        if (this.current.children.some(c => c.name === name)) {
            throw new Error('名称已存在');
        }
        const folder = {
            id: Date.now().toString(),
            name,
            type: 'folder',
            modified: new Date().toISOString().slice(0, 10).replace(/-/g, '/') + ' ' + 
                      new Date().toTimeString().slice(0, 5),
            children: []
        };
        this.current.children.push(folder);
        this.shouldAnimate = false;
        return folder;
    }

    rename(item, newName) {
        if (newName !== item.name && this.current.children.some(c => c.name === newName)) {
            throw new Error('名称已存在');
        }
        item.name = newName;
        item.modified = new Date().toISOString().slice(0, 10).replace(/-/g, '/') + ' ' + 
                       new Date().toTimeString().slice(0, 5);
        this.shouldAnimate = false;
    }

    delete(item) {
        this.current.children = this.current.children.filter(c => c !== item);
        if (this.selected === item) this.selected = null;
        this.shouldAnimate = false;
    }
}