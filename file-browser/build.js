const fs = require('fs');
const path = require('path');

const CONFIG = {
  // 扫描仓库根目录
  sourceDir: path.join(__dirname, '..'),
  
  // 只生成 fb/ 目录，不复制文件
  outputDir: path.resolve(__dirname, process.argv[2] || '../fb'),
  
  ignore: ['.git', '.github', 'node_modules', '.DS_Store', 'Thumbs.db', 'file-browser', 'fb'],
  maxDepth: 10,
  showHidden: false
};

const FILE_TYPES = {
  image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'],
  video: ['.mp4', '.avi', '.mov', '.mkv', '.flv'],
  audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg'],
  code: ['.html', '.css', '.js', '.json', '.xml', '.py', '.java', '.cpp', '.c', '.h', '.php', '.rb', '.go', '.rs', '.ts', '.jsx', '.tsx', '.vue'],
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
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileStats(stats) {
  return {
    modified: stats.mtime.toISOString().slice(0, 10).replace(/-/g, '/') + ' ' + stats.mtime.toTimeString().slice(0, 5),
    size: stats.isDirectory() ? null : formatSize(stats.size),
    sizeBytes: stats.size
  };
}

function shouldIgnore(name) {
  return CONFIG.ignore.includes(name) || (!CONFIG.showHidden && name.startsWith('.'));
}

// 🔥 关键：只扫描，不复制文件，路径指向 ../文件名
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
  const id = relativePath ? relativePath.replace(/[\/\\]/g, '-').replace(/[^a-zA-Z0-9-]/g, '_') : 'root';
  
  const node = {
    id,
    name,
    type: stats.isDirectory() ? 'folder' : 'file',
    modified: getFileStats(stats).modified
  };

  if (stats.isDirectory()) {
    node.children = [];
    
    try {
      const entries = fs.readdirSync(dirPath);
      for (const entry of entries) {
        if (shouldIgnore(entry)) continue;
        const child = scanDirectory(path.join(dirPath, entry), path.join(relativePath, entry), depth + 1);
        if (child) node.children.push(child);
      }
      node.children.sort((a, b) => (a.type === b.type) ? a.name.localeCompare(b.name) : (a.type === 'folder' ? -1 : 1));
    } catch (err) {
      node.error = 'Permission denied';
    }
  } else {
    // 🔥 文件：记录大小和类型
    node.size = getFileStats(stats).size;
    node.fileType = getFileType(path.extname(name));
    
    // 🔥 关键：路径是相对于 fb/ 目录的 ../文件名
    // 访问者在 /fb/ 看文件，文件在 /文件名
    const webPath = relativePath.replace(/\\/g, '/');
    node.openUrl = `../${webPath}`;
    node.downloadUrl = `../${webPath}`;
  }

  return node;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  ensureDir(dest);
  fs.readdirSync(src).forEach(entry => {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

function build() {
  console.log('🔨 Building...\n');
  console.log(`📁 Scan: ${path.resolve(CONFIG.sourceDir)}`);
  console.log(`📦 Output: ${path.resolve(CONFIG.outputDir)}`);

  // 清理
  if (fs.existsSync(CONFIG.outputDir)) {
    fs.rmSync(CONFIG.outputDir, { recursive: true });
  }

  // 扫描（只生成 JSON，不复制文件）
  console.log('\n🔍 Scanning...');
  const rootNode = scanDirectory(CONFIG.sourceDir, '');
  rootNode.name = 'root';

  let fileCount = 0, folderCount = 0;
  function count(n) {
    if (n.type === 'folder') { folderCount++; n.children?.forEach(count); }
    else fileCount++;
  }
  count(rootNode);
  console.log(`✅ ${folderCount} folders, ${fileCount} files`);

  // 创建目录结构
  ensureDir(CONFIG.outputDir);
  ensureDir(path.join(CONFIG.outputDir, 'fb', 'data'));

  // 保存 JSON
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'fb', 'data', 'filesystem.json'),
    JSON.stringify(rootNode, null, 2)
  );

  // 只复制前端代码（src/ → fb/）
  const srcDir = path.join(__dirname, 'src');
  const fbDir = path.join(CONFIG.outputDir, 'fb');
  if (fs.existsSync(srcDir)) {
    copyDir(srcDir, fbDir);
    console.log('📄 Frontend copied');
  }

  // .nojekyll
  fs.writeFileSync(path.join(fbDir, '.nojekyll'), '');
  
  console.log('\n✨ Done!');
  console.log(`输出: ${path.resolve(CONFIG.outputDir)}/fb/`);
  console.log('文件通过 ../文件名 链接，不复制');
}

build();