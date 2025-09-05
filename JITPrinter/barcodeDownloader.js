// 条码表下载功能模块
class BarcodeDownloader {
    constructor(jitOrderSystem) {
        this.jitOrderSystem = jitOrderSystem;
    }

    /**
     * 下载条码表功能
     * 总是使用打印页面逻辑插入sticker
     */
    downloadBarcodeTable() {
        const checkboxes = document.querySelectorAll('.row-checkbox:checked');

        if (checkboxes.length === 0) {
            this.jitOrderSystem.showToast('请先选择要下载的数据行！');
            return;
        }

        // 首先收集所有选中的SKC和印花编码组合
        const skcPatternToCollect = new Set();
        checkboxes.forEach(checkbox => {
            const $checkbox = $(checkbox);
            
            // 检查是否为组复选框且有组数据
            if (checkbox.classList.contains('group-checkbox') && $checkbox.data('groupData')) {
                const groupData = $checkbox.data('groupData');
                // 将组内所有SKC和印花编码组合加入集合
                groupData.forEach(itemData => {
                    skcPatternToCollect.add(`${itemData.skc}|${itemData.pattern}`);
                });
            } else {
                // 处理普通行
                const row = checkbox.closest('tr');
                if (row) {
                    // 找到可见的单元格
                    let visibleCells = Array.from(row.querySelectorAll('td')).filter(cell => 
                        !cell.classList.contains('hidden-cell')
                    );
                    
                    // 如果当前行是合并组中的非首行，找到对应的首行
                    if (visibleCells.length < 7) {
                        const rowIndex = Array.from(row.parentNode.children).indexOf(row);
                        let firstRow = row;
                        
                        // 向上查找直到找到首行
                        for (let i = rowIndex - 1; i >= 0; i--) {
                            const prevRow = row.parentNode.children[i];
                            const prevVisibleCells = Array.from(prevRow.querySelectorAll('td')).filter(cell => 
                                !cell.classList.contains('hidden-cell')
                            );
                            if (prevVisibleCells.length === 7) {
                                firstRow = prevRow;
                                break;
                            }
                        }
                        
                        // 从首行获取SKC和印花编码
                        const firstVisibleCells = Array.from(firstRow.querySelectorAll('td')).filter(cell => 
                            !cell.classList.contains('hidden-cell')
                        );
                        const skc = firstVisibleCells[2].textContent.trim();
                        const pattern = firstVisibleCells[3].textContent.trim();
                        skcPatternToCollect.add(`${skc}|${pattern}`);
                    } else {
                        // 普通行处理
                        const skc = visibleCells[2].textContent.trim();
                        const pattern = visibleCells[3].textContent.trim();
                        skcPatternToCollect.add(`${skc}|${pattern}`);
                    }
                }
            }
        });

        // 根据SKC和印花编码组合分组收集条码数据
        const skcPatternGroups = new Map();
        this.jitOrderSystem.processedData.forEach(item => {
            const skcPatternKey = `${item.skc}|${item.pattern}`;
            if (skcPatternToCollect.has(skcPatternKey)) {
                if (!skcPatternGroups.has(skcPatternKey)) {
                    skcPatternGroups.set(skcPatternKey, []);
                }
                skcPatternGroups.get(skcPatternKey).push({
                    '商品编码': item.originalSku,
                    '数量': item.quantity || 0
                });
            }
        });

        // 创建最终数据数组
        const finalData = [];
        
        // 总是使用打印页面逻辑插入sticker
        // 在打印的每个页的最后一个skc后面插入sticker
        this._insertStickerByPrintPage(skcPatternGroups, finalData);

        // 创建工作簿
        const wb = XLSX.utils.book_new();
        
        // 转换数据为工作表格式
        const ws = XLSX.utils.json_to_sheet(finalData);
        
        // 设置列宽
        const colWidths = [
            { wch: 20 }, // 商品编码列宽
            { wch: 10 }  // 数量列宽
        ];
        ws['!cols'] = colWidths;
        
        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(wb, ws, '条码数据');
        
        // 生成文件名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${this.jitOrderSystem.batchNumber}_条码表_${timestamp}.xlsx`;
        
        // 下载文件
        XLSX.writeFile(wb, filename);
        
        // 显示成功提示
        this.jitOrderSystem.showToast(`已下载 ${finalData.length} 条数据（含sticker记录）到Excel文件！`);
    }

    /**
     * 根据打印页面逻辑插入sticker
     * 在实际打印的每页最后一个skc后面插入
     * 采用用户建议的固定每页7个SKC的方法
     * @param {Map} skcPatternGroups - SKC和印花编码组合的分组数据
     * @param {Array} finalData - 最终数据数组
     */
    _insertStickerByPrintPage(skcPatternGroups, finalData) {
        // 获取所有SKC组的键
        const skcKeys = Array.from(skcPatternGroups.keys());
        
        // 每页固定显示7个SKC
        const skcsPerPage = 7;
        
        // 遍历所有SKC组
        for (let i = 0; i < skcKeys.length; i++) {
            const skcPatternKey = skcKeys[i];
            const skuItems = skcPatternGroups.get(skcPatternKey);
            
            // 添加当前SKC组的所有条码数据
            skuItems.forEach(skuItem => {
                finalData.push(skuItem);
            });
            
            // 检查是否需要插入sticker：
            // 1. 如果是每7个SKC的倍数（即每页的最后一个SKC）
            // 2. 或者是最后一个SKC组
            if ((i + 1) % skcsPerPage === 0 || i === skcKeys.length - 1) {
                // 在每页最后一个SKC后面插入sticker
                finalData.push({
                    '商品编码': 'sticker',
                    '数量': '2'
                });
            }
        }
    }
}

// 将类暴露到全局window对象
if (typeof window !== 'undefined') {
    window.BarcodeDownloader = BarcodeDownloader;
}