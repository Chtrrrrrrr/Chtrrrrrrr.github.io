function copyToClipboard() {
    const mcLink = document.querySelector("#mc-link");
    mcLink.select();
    document.execCommand("copy");
    alert("服务器地址复制成功！");
}
