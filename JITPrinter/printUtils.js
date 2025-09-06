/**
 * 打印功能工具模块
 * 独立处理表格的打印功能
 */

// 防止重复加载
if (typeof window !== 'undefined' && !window.PrintUtils) {
    window.PrintUtils = {
        // 验证全局销售数据汇总变量是否存在并有效
        validateStats() {
            if (!window.salesDataSummary) {
                window.salesDataSummary = {
                    batchNumber: '',
                    styleSKCCount: 0,
                    orderQuantity: 0,
                    printTypeCount: 0
                };
            }
            // 确保所有字段都存在
            window.salesDataSummary.batchNumber = window.salesDataSummary.batchNumber || '';
            window.salesDataSummary.styleSKCCount = window.salesDataSummary.styleSKCCount || 0;
            window.salesDataSummary.orderQuantity = window.salesDataSummary.orderQuantity || 0;
            window.salesDataSummary.printTypeCount = window.salesDataSummary.printTypeCount || 0;
        },

        // 设置打印按钮功能
        setupPrintButton() {
            $('#printTabBtn').on('click', () => {
                // 验证全局统计变量
                this.validateStats();

                // 获取当前激活的tab内容
                const activeTab = $('.tab-content.active')[0];

                if (activeTab) {
                    // 创建打印窗口
                    const printWindow = window.open('', '_blank');

                    // 获取当前tab的标题
                    const tabTitle = $('.tab-btn.active').text();
                    const timestamp = new Date().toLocaleString('zh-CN');

                    // 直接从页面元素中获取汇总数据，而不是依赖全局变量
                    const batchNumber = $('#batchNumber').text() || window.salesDataSummary.batchNumber || '';
                    const styleSKCCount = parseInt($('#styleSKCCount').text()) || window.salesDataSummary.styleSKCCount || 0;
                    const orderQuantity = parseInt($('#orderQuantity').text()) || window.salesDataSummary.orderQuantity || 0;
                    const printTypeCount = parseInt($('#printTypeCount').text()) || window.salesDataSummary.printTypeCount || 0;

                    // 准备表格HTML内容并预处理（直接在HTML字符串中添加merged-cell类）
                    let tableHtml = $(activeTab).find('table').length ? $(activeTab).find('table')[0].outerHTML : activeTab.innerHTML;

                    // 在表格HTML字符串中直接为图片列和SKC列的td添加merged-cell类
                    // 1. 先将HTML转换为jQuery对象进行操作
                    let tempTable = $(tableHtml);

                    // 3. 判断是否为空版检货表格并添加相应类
                    if (tabTitle.includes('检货') && tempTable.find('tbody tr').length > 1) {
                        const firstDataRow = tempTable.find('tbody tr').eq(1);
                        if (firstDataRow.find('td').length > 0 && firstDataRow.find('td').eq(0).text().trim() === '') {
                            tempTable.addClass('empty-check-table');
                        }
                    }

                    // 2. 遍历表格行，直接添加merged-cell类
                    tempTable.find('tbody tr').each(function () {
                        let cells = $(this).find('td');
                        
                        // 检查当前是否是烫画数量汇总表（patternSummary）
                        const isPatternSummary = tabTitle.includes('烫画数量汇总');

                        // 检查是否为SKC组的第一行（有图片单元格）
                        if (cells.length > 0 && cells.eq(0).find('img').length > 0) {
                            // 直接为图片列（第一列）添加merged-cell类
                            cells.eq(0).addClass('merged-cell');
                            
                            // 对于其他列，只有非空版检货单且非烫画数量汇总表才添加merged-cell类
                            if (cells.length > 2 && !tempTable.hasClass('empty-check-table') && !isPatternSummary) {
                                cells.eq(2).addClass('merged-cell');
                            }
                            // 标记为SKC组行
                            $(this).addClass('skc-group-row');
                        }

                        // 为具有rowspan属性的td添加merged-cell类
                        if (tempTable.hasClass('empty-check-table')) {
                            // 空版检货单特殊处理：只为图片列添加merged-cell类，不给尺码列和其他列添加
                            // 第一列（图片列）
                            cells.eq(0).filter('[rowspan]').addClass('merged-cell');
                        } else if (isPatternSummary) {
                            // 烫画数量汇总表，只为图片列添加merged-cell类
                            cells.eq(0).filter('[rowspan]').addClass('merged-cell');
                        } else {
                            // 其他表格类型，为所有具有rowspan属性的td添加merged-cell类
                            cells.filter('[rowspan]').addClass('merged-cell');
                        }
                    });

                    // 4. 转换回HTML字符串
                    let processedTableHtml = tempTable.prop('outerHTML');

                    // 检查是否为空版检货表格
                    const isEmptyCheckTable = tempTable.hasClass('empty-check-table');

                    // 构建打印内容
                    printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>${tabTitle} - ${timestamp}</title>
                            <link rel="stylesheet" href="style.css">
                            <style>
                                :root {
                                    --header-title: '${tabTitle}';
                                    --header-style-count: '${styleSKCCount}';
                                    --header-order-quantity: '${orderQuantity}';
                                    --header-batch-number: '${batchNumber}';
                                    --header-timestamp: '${timestamp}';
                                }
                            </style>
                        </head>
                        <body>
                            <div class="print-container">
                                <!-- CSS @page规则会在每一页顶部自动显示页眉 -->
                                <!-- 下面的div用于屏幕预览时显示页眉，打印时会被CSS控制 -->
                                <div class="print-header-screen">
                                   <div>${tabTitle}</div> ★ <div>款式汇总: <span id="styleSummary">${styleSKCCount} 款</span> </div> ★ <div>订单件数: <span id="orderQuantity">${orderQuantity} 件</span> </div> ★ <div>批次: ${batchNumber}</div>
                                </div>
                                
                                <!-- 表格内容部分 -->
                                <div class="table-container">
                                    <!-- 使用预处理后的表格HTML内容 -->
                                    ${processedTableHtml}
                                </div>
                            </div>
                        </body>
                        </html>
                    `);

                    printWindow.document.close();

                    // 延迟一下确保内容加载完成后再打印
                    setTimeout(() => {
                        printWindow.print();
                        // printWindow.close(); // 可选：打印后自动关闭窗口
                    }, 500);
                }
            });
        },

        // 初始化打印功能
        init() {
            this.setupPrintButton();
            // 确保全局统计变量已初始化
            this.validateStats();
        }
    };

    // 使用jQuery的ready方法在DOM加载完成后初始化打印功能
    $(() => {
        window.PrintUtils.init();
    });
}