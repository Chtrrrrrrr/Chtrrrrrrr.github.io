class Renderer {
    constructor(fs) {
        this.fs = fs;
        this.els = {
            list: document.getElementById('file-list'),
            path: document.getElementById('current-path'),
            folderCount: document.getElementById('folder-count'),
            fileCount: document.getElementById('file-count'),
            preview: document.getElementById('preview-panel'),
            btnBack: document.getElementById('btn-back'),
            btnForward: document.getElementById('btn-forward'),
            btnUp: document.getElementById('btn-up')
        };
    }

    render(search = '') {
        const { list, path, folderCount, fileCount, btnBack, btnForward, btnUp } = this.els;
        
        list.innerHTML = '';
        path.textContent = '/' + this.fs.path;
        
        btnBack.disabled = !this.fs.canGoBack;
        btnForward.disabled = !this.fs.canGoForward;
        btnUp.disabled = this.fs.isAtRoot;

        const items = this.fs.getFilteredChildren(search);
        const stats = this.fs.getStats();
        folderCount.textContent = `${stats.folders} 文件夹`;
        fileCount.textContent = `${stats.files} 文件`;

        items.forEach((item, i) => {
            const row = document.createElement('div');
            const anim = this.fs.shouldAnimate ? `animate-fade-in delay-${Math.min(i+1, 8)}` : '';
            row.className = `file-row h-10 flex items-center px-4 border-b border-slate-800/50 text-sm cursor-pointer group ${this.fs.selected === item ? 'selected' : ''} ${anim}`;
            
            const isFolder = item.type === 'folder';
            const icon = isFolder ? 'ph-folder text-yellow-500' : 'ph-file-text text-slate-300';
            const nameClass = isFolder ? 'text-yellow-500/90 group-hover:text-yellow-400' : 'text-slate-200 group-hover:text-white';
            const size = isFolder ? '-' : item.size;
            const arrow = isFolder ? '<i class="ph ph-caret-right text-xs ml-1 text-slate-600"></i>' : '';
            
            let actions = '';
            if (!isFolder && item.openUrl) {
                actions += `<button class="open-btn text-blue-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 mr-2"><i class="ph ph-arrow-square-out text-lg"></i></button>`;
            }
            if (!isFolder && item.downloadUrl) {
                actions += `<button class="dl-btn text-green-500 hover:text-green-400 opacity-0 group-hover:opacity-100"><i class="ph ph-download-simple text-lg"></i></button>`;
            }

            row.innerHTML = `
                <div class="w-8 flex justify-center"><i class="ph ${icon} text-xl"></i></div>
                <div class="flex-1 pl-2 ${nameClass} flex items-center truncate">${item.name}${arrow}</div>
                <div class="w-32 text-right text-slate-400 font-mono text-xs">${size}</div>
                <div class="w-40 text-right text-slate-500 font-mono text-xs">${item.modified}</div>
                <div class="w-20 text-center flex justify-center">${actions}</div>
            `;

            row.onclick = (e) => {
                if (e.target.closest('button')) return;
                this.fs.select(item);
                this.render(search);
                this.renderPreview(item);
            };

            if (isFolder) {
                row.ondblclick = () => {
                    this.fs.enter(item);
                    this.render();
                };
            } else if (item.openUrl) {
                row.ondblclick = () => Utils.openFile(item.openUrl);
            }

            row.querySelector('.open-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                Utils.openFile(item.openUrl);
            });
            
            row.querySelector('.dl-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                Utils.downloadFile(item.downloadUrl, item.name);
            });

            list.appendChild(row);
        });

        if (items.length === 0) {
            list.innerHTML = `<div class="text-center text-slate-600 mt-10 text-sm">${search ? '无匹配' : '空文件夹'}</div>`;
        }

        this.fs.shouldAnimate = false;
    }

    renderPreview(item) {
        const panel = this.els.preview;
        
        if (!item) {
            panel.innerHTML = `
                <div class="w-24 h-24 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 ring-1 ring-slate-700">
                    <i class="ph ph-file-text text-4xl text-slate-600"></i>
                </div>
                <h3 class="text-slate-300 font-medium">选择文件预览</h3>
            `;
            return;
        }

        const isFolder = item.type === 'folder';
        const icon = isFolder ? 'ph-folder text-yellow-500' : 'ph-file-text text-blue-400';
        
        const details = [
            { k: '类型', v: isFolder ? '文件夹' : (item.fileType || '文件') },
            { k: isFolder ? '包含' : '大小', v: isFolder ? (item.children?.length || 0) + ' 项' : item.size },
            { k: '修改', v: item.modified }
        ];
        if (item.created && item.created !== item.modified) details.push({ k: '创建', v: item.created });
        if (item.totalSize) details.push({ k: '总计', v: item.totalSize });

        const detailsHtml = details.map(d => `
            <div class="flex justify-between border-b border-slate-800 py-1.5 text-xs">
                <span class="text-slate-500">${d.k}</span>
                <span class="text-slate-300 truncate max-w-[140px]">${d.v}</span>
            </div>
        `).join('');

        let buttons = '';
        if (!isFolder && item.openUrl) {
            buttons += `<button onclick="Utils.openFile('${item.openUrl}')" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm"><i class="ph ph-arrow-square-out mr-1"></i>打开</button>`;
        }
        if (!isFolder && item.downloadUrl) {
            buttons += `<button onclick="Utils.downloadFile('${item.downloadUrl}', '${item.name}')" class="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm ml-2"><i class="ph ph-download-simple mr-1"></i>下载</button>`;
        }

        panel.innerHTML = `
            <div class="w-32 h-32 rounded-2xl bg-slate-800/80 flex items-center justify-center mb-6 ring-1 ring-slate-700">
                <i class="ph ${icon} text-6xl"></i>
            </div>
            <h3 class="text-slate-200 font-medium text-lg mb-1 truncate max-w-full px-4">${item.name}</h3>
            <div class="w-full px-6 mt-4">${detailsHtml}</div>
            ${buttons ? `<div class="flex mt-6">${buttons}</div>` : ''}
        `;
    }
}