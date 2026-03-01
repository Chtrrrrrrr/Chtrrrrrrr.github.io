class App {
    constructor() {
        this.fs = new FileSystem();
        this.renderer = null;
        this.searchInput = document.getElementById('search-input');
    }

    async init() {
        await this.fs.load();
        this.renderer = new Renderer(this.fs);
        this.renderer.render();
        this.bindEvents();
        this.startClock();
    }

    bindEvents() {
        // 搜索
        this.searchInput.addEventListener('input', Utils.debounce(() => {
            this.renderer.render(this.searchInput.value);
        }, 300));

        // 导航按钮
        document.getElementById('btn-back').onclick = () => {
            if (this.fs.back()) {
                this.searchInput.value = '';
                this.renderer.render();
            }
        };
        document.getElementById('btn-forward').onclick = () => {
            if (this.fs.forward()) {
                this.searchInput.value = '';
                this.renderer.render();
            }
        };
        document.getElementById('btn-up').onclick = () => {
            if (this.fs.up()) {
                this.searchInput.value = '';
                this.renderer.render();
            }
        };

        // 键盘
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                if (this.fs.back()) { this.searchInput.value = ''; this.renderer.render(); }
            } else if (e.altKey && e.key === 'ArrowRight') {
                e.preventDefault();
                if (this.fs.forward()) { this.searchInput.value = ''; this.renderer.render(); }
            } else if (e.altKey && e.key === 'ArrowUp') {
                e.preventDefault();
                if (this.fs.up()) { this.searchInput.value = ''; this.renderer.render(); }
            } else if (e.key === 'F2') {
                e.preventDefault();
                this.rename();
            } else if (e.key === 'Delete') {
                this.delete();
            } else if (e.key === 'Escape') {
                this.fs.deselect();
                this.renderer.render(this.searchInput.value);
                this.renderer.renderPreview(null);
            } else if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                this.searchInput.focus();
            }
        });
    }

    createFolder() {
        const name = prompt('文件夹名称:', '新建文件夹');
        if (!name) return;
        try {
            this.fs.createFolder(name);
            this.renderer.render(this.searchInput.value);
        } catch (e) {
            alert(e.message);
        }
    }

    rename() {
        if (!this.fs.selected) { alert('请先选择'); return; }
        const newName = prompt('重命名:', this.fs.selected.name);
        if (!newName || newName === this.fs.selected.name) return;
        try {
            this.fs.rename(this.fs.selected, newName);
            this.renderer.render(this.searchInput.value);
            this.renderer.renderPreview(this.fs.selected);
        } catch (e) {
            alert(e.message);
        }
    }

    delete() {
        if (!this.fs.selected) { alert('请先选择'); return; }
        if (!confirm(`删除 "${this.fs.selected.name}"?`)) return;
        this.fs.delete(this.fs.selected);
        this.renderer.render(this.searchInput.value);
        this.renderer.renderPreview(null);
    }

    startClock() {
        const update = () => {
            document.getElementById('clock').textContent = 
                new Date().toLocaleTimeString('en-GB');
        };
        update();
        setInterval(update, 1000);
    }
}

const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());