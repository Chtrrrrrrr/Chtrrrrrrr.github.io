const fs = require('fs');
const path = require('path');

// 从命令行参数获取输出目录，默认为 ../fb
const outputDirArg = process.argv[2] || '../fb';
const CONFIG = {
  // 扫描上级目录（main 分支根目录）
  sourceDir: path.join(__dirname, '..'),
  
  // 输出目录（可配置）
  outputDir: path.resolve(__dirname, outputDirArg),
  
  ignore: [
    '.git', 
    '.github', 
    'node_modules',
    '.DS_Store', 
    'Thumbs.db',
    'file-browser'  // 跳过自己
  ],
  
  maxDepth: 10,
  sizeLimit: 100 * 1024 * 1024,
  showHidden: false
};

// 文件类型映射
const FILE_TYPES = {
  image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'],
  video: ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv'],
  audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'],
  code: ['.html', '.css', '.js', '.json', '.xml', '.py', '.java', '.cpp', '.c', '.h', 
         '.php', '.rb', '.go', '.rs', '.ts', '.jsx', '.tsx', '.vue'],
  archive: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'],
  doc: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md'],
  exe: ['.exe', '.msi', '.dmg', '.pkg', '.deb', '.rpm']
};

function getFileType(ext) {
  ext = ext.toLowerCase();
  for (const [type, exts] of Object.entries(FILE_TYPES)) {
    if (exts.includes(ext)) return type;
  }
  return 'file';
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes > CONFIG.sizeLimit) return '>100 MB';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getStats(stats) {
  return {
    modified: stats.mtime.toISOString().slice(0, 10).replace(/-/g, '/') + ' ' + 
              stats.mtime.toTimeString().slice(0, 5),
    created: stats.birthtime.toISOString().slice(0, 10).replace(/-/g, '/') + ' ' + 
             stats.birthtime.toTimeString().slice(0, 5),
    sizeBytes: stats.size,
    size: formatSize(stats.size),
    mode: (stats.mode & parseInt('777', 8)).toString(8)
  };
}

function shouldIgnore(name) {
  if (CONFIG.ignore.includes(name)) return true;
  if (!CONFIG.showHidden && name.startsWith('.')) return true;
  return false;
}

function scanDirectory(dirPath, relativePath = '', depth = 0) {
  if (depth > CONFIG.maxDepth) {
    return { id: 'max-depth', name: '...', type: 'folder', modified: '-', truncated: true };
  }

  let stats;
  try {
    stats = fs.statSync(dirPath);
  } catch (err) {
    return null;
  }

  const name = path.basename(dirPath);
  const id = relativePath 
    ? relativePath.replace(/[\/\\]/g, '-').replace(/[^a-zA-Z0-9-]/g, '_')
    : 'root';
  
  const node = {
    id,
    name,
    type: stats.isDirectory() ? 'folder' : 'file',
    ...getFileStats(stats)
  };

  if (stats.isDirectory()) {
    node.children = [];
    
    try {
      const entries = fs.readdirSync(dirPath);
      
      for (const entry of entries) {
        if (shouldIgnore(entry)) continue;
        
        const fullPath = path.join(dirPath, entry);
        const relPath = path.join(relativePath, entry);
        
        const child = scanDirectory(fullPath, relPath, depth + 1);
        if (child) node.children.push(child);
      }
      
      node.children.sort((a, b) => {
        const aIsFolder = a.type === 'folder';
        const bIsFolder = b.type === 'folder';
        if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      
      node.totalSize = formatSize(
        node.children.reduce((sum, c) => sum + (c.sizeBytes || 0), 0)
      );
      
    } catch (err) {
      node.error = 'Permission denied';
    }
  } else {
    const ext = path.extname(name);
    node.extension = ext;
    node.fileType = getFileType(ext);
    
    // 关键：路径相对于 fb/index.html
    // fb/ 里的文件要访问 ../文件名
    const webPath = relativePath.replace(/\\/g, '/');
    node.openUrl = `../${webPath}`;
    node.downloadUrl = `../${webPath}`;
  }

  return node;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    ensureDir(dest);
    fs.readdirSync(src).forEach(entry => {
      if (shouldIgnore(entry)) return;
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function build() {
  console.log('🔨 Building file browser...\n');
  console.log(`📁 Source: ${path.resolve(CONFIG.sourceDir)}`);
  console.log(`📦 Output: ${path.resolve(CONFIG.outputDir)}\n`);

  // 清理
  if (fs.existsSync(CONFIG.outputDir)) {
    fs.rmSync(CONFIG.outputDir, { recursive: true });
  }

  // 扫描
  console.log('🔍 Scanning...');
  const rootNode = scanDirectory(CONFIG.sourceDir, '');
  rootNode.name = 'root';

  let fileCount = 0, folderCount = 0;
  function count(n) {
    if (n.type === 'folder') { folderCount++; n.children?.forEach(count); }
    else fileCount++;
  }
  count(rootNode);
  console.log(`✅ Found: ${folderCount} folders, ${fileCount} files\n`);

  // 创建目录
  ensureDir(CONFIG.outputDir);

  // 保存 JSON
  const jsonPath = path.join(CONFIG.outputDir, 'fb', 'data', 'filesystem.json');
  ensureDir(path.dirname(jsonPath));
  fs.writeFileSync(jsonPath, JSON.stringify(rootNode, null, 2));
  console.log(`💾 JSON: ${jsonPath}`);

  // 复制前端代码到 fb/
  const srcDir = path.join(__dirname, 'src');
  const fbDir = path.join(CONFIG.outputDir, 'fb');
  if (fs.existsSync(srcDir)) {
    copyRecursive(srcDir, fbDir);
    console.log(`📄 Frontend: ${fbDir}`);
  }

  // .nojekyll
  fs.writeFileSync(path.join(fbDir, '.nojekyll'), '');
  
  console.log('\n✨ Done!');
}

build();