// ======================================================================================
// YOURFINALFINANCER APPLICATION SCRIPT
// ======================================================================================

// --- Global Variables (Loaded from Local Storage or defaults) ---
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
let savingGoals = JSON.parse(localStorage.getItem('savingGoals')) || [];
let recurringEntries = JSON.parse(localStorage.getItem('recurringEntries')) || [];
let currentCurrency = localStorage.getItem('currency') || 'USD';
const currencySymbols = { USD: '$', EUR: '€', GBP: '£', NGN: '₦' };
let myChart; // For the Chart.js instance
let inventoryRowIndex = 0; // For unique IDs in the inventory form

// --- UTILITY FUNCTIONS ---
function formatCurrency(amount, currency = currentCurrency) {
    const symbol = currencySymbols[currency] || '$';
    return `${symbol}${Number(amount).toFixed(2)}`;
}

// Function to save all data to localStorage
function saveAllData() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('inventory', JSON.stringify(inventory));
    localStorage.setItem('savingGoals', JSON.stringify(savingGoals));
    localStorage.setItem('recurringEntries', JSON.stringify(recurringEntries));
    localStorage.setItem('currency', currentCurrency);
}

// --------------------------------------------------------------------------------------
// --- CORE FUNCTIONALITY IMPLEMENTATION (Dashboard & Transaction Logic) ---
// --------------------------------------------------------------------------------------

// 1. Dashboard: Record Transaction
function addTransaction() {
    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const type = document.getElementById('type').value;
    const date = document.getElementById('date').value;

    if (!description || amount <= 0 || !date) {
        alert("Please fill out all transaction fields correctly.");
        return;
    }

    const newTransaction = {
        id: Date.now(),
        description: description,
        amount: amount,
        type: type,
        date: date
    };

    transactions.unshift(newTransaction);
    saveAllData();

    document.getElementById('transactionForm').reset();
    updateSummary();
    renderTransactions();
}

// 2. Dashboard: Update Financial Summary & Chart
function updateSummary() {
    let totalIncome = 0;
    let totalExpense = 0;
    const balanceHistory = {}; // Store daily balance for the chart

    transactions.forEach(t => {
        const dateKey = t.date;
        const amount = t.amount;

        if (t.type === 'income') {
            totalIncome += amount;
        } else {
            totalExpense += amount;
        }

        // Calculate daily cumulative balance for the chart
        if (!balanceHistory[dateKey]) {
            balanceHistory[dateKey] = 0;
        }
        balanceHistory[dateKey] += (t.type === 'income' ? amount : -amount);
    });

    const currentBalance = totalIncome - totalExpense;

    document.getElementById('currentBalance').textContent = formatCurrency(currentBalance);
    document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
    document.getElementById('totalExpense').textContent = formatCurrency(totalExpense);

    // Prepare Chart Data
    const sortedDates = Object.keys(balanceHistory).sort();
    let cumulativeBalance = 0;
    const chartLabels = [];
    const chartData = [];

    sortedDates.forEach(date => {
        cumulativeBalance += balanceHistory[date];
        chartLabels.push(date);
        chartData.push(cumulativeBalance);
    });
    
    // Initialize or Update Chart.js
    const ctx = document.getElementById('balanceChart').getContext('2d');
    if (myChart) {
        myChart.data.labels = chartLabels;
        myChart.data.datasets[0].data = chartData;
        myChart.data.datasets[0].label = `Balance (${currencySymbols[currentCurrency]})`;
        myChart.update();
    } else {
        myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: `Balance (${currencySymbols[currentCurrency]})`,
                    data: chartData,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: false }
                }
            }
        });
    }
}

// 3. Dashboard: Render Transactions List
function renderTransactions() {
    const list = document.getElementById('transactionList');
    if (!list) return;

    // Sort by date (newest first)
    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    list.innerHTML = sortedTransactions.slice(0, 10).map((t, index) => {
        return `
            <li class="transaction-item">
                <div>${t.date}</div>
                <div>${t.description}</div>
                <div class="${t.type}">${t.type.toUpperCase()}</div>
                <div class="align-right ${t.type}">${formatCurrency(t.amount)}</div>
                <div class="align-right">
                    <button onclick="openEditModal(${index})" class="secondary-btn" style="padding: 5px 8px; font-size: 0.8em;"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteTransaction(${index})" class="delete-btn" style="padding: 5px 8px; font-size: 0.8em;"><i class="fas fa-trash"></i></button>
                </div>
            </li>
        `;
    }).join('');
}

// 4. Dashboard: Delete Transaction
function deleteTransaction(index) {
    if (confirm(`Are you sure you want to delete the transaction: ${transactions[index].description}?`)) {
        transactions.splice(index, 1);
        saveAllData();
        updateSummary();
        renderTransactions();
    }
}

// 5. Dashboard: Edit Modal Logic
function openEditModal(index) {
    const transactionToEdit = transactions[index];
    
    document.getElementById('editIndex').value = index;
    document.getElementById('editDescription').value = transactionToEdit.description;
    document.getElementById('editAmount').value = transactionToEdit.amount;
    document.getElementById('editType').value = transactionToEdit.type;
    document.getElementById('editDate').value = transactionToEdit.date;
    
    document.getElementById('editModal').style.display = 'block';
}

function saveEditedTransaction(event) {
    event.preventDefault();
    
    const index = parseInt(document.getElementById('editIndex').value);
    const description = document.getElementById('editDescription').value;
    const amount = parseFloat(document.getElementById('editAmount').value);
    const type = document.getElementById('editType').value;
    const date = document.getElementById('editDate').value;
    
    transactions[index] = { ...transactions[index], description, amount, type, date };

    saveAllData();
    updateSummary();
    renderTransactions();
    closeModal();
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}


// --------------------------------------------------------------------------------------
// --- INVENTORY FUNCTIONALITY ---
// --------------------------------------------------------------------------------------

// 6. Inventory: Add Item Row (Functional)
function addInventoryRow() {
    const container = document.getElementById('dynamicInventoryInputs');
    if (!container) return; 

    const row = document.createElement('div');
    row.classList.add('inventory-new-row');
    row.id = `inv-row-${inventoryRowIndex}`;
    
    row.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 1fr 0.1fr; gap: 10px; margin-bottom: 10px; align-items: end;';

    row.innerHTML = `
        <div class="input-group">
            <label for="itemName-${inventoryRowIndex}">Item Name</label>
            <input type="text" id="itemName-${inventoryRowIndex}" name="name" required placeholder="Product Name">
        </div>
        <div class="input-group">
            <label for="itemStock-${inventoryRowIndex}">Stock</label>
            <input type="number" id="itemStock-${inventoryRowIndex}" name="stock" required min="0" placeholder="Qty">
        </div>
        <div class="input-group">
            <label for="itemPrice-${inventoryRowIndex}">Unit Price</label>
            <input type="number" id="itemPrice-${inventoryRowIndex}" name="price" required min="0.01" step="0.01" placeholder="Price ($)">
        </div>
        <button type="button" class="delete-btn" onclick="removeInventoryRow('inv-row-${inventoryRowIndex}')" style="padding: 8px 12px; height: 40px; margin-bottom: 15px;">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(row);
    inventoryRowIndex++;
}

// Utility function to remove the dynamically created row
function removeInventoryRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
    }
}

// 7. Inventory: Save All New Inventory (Functional)
function submitMultiInventory() {
    const container = document.getElementById('dynamicInventoryInputs');
    if (!container) return;

    let itemsProcessed = 0;
    const rows = container.querySelectorAll('.inventory-new-row');

    rows.forEach(row => {
        const nameInput = row.querySelector('input[name="name"]');
        const stockInput = row.querySelector('input[name="stock"]');
        const priceInput = row.querySelector('input[name="price"]');
        
        // Skip incomplete rows
        if (!nameInput || !stockInput || !priceInput || !nameInput.value || !stockInput.value || !priceInput.value) {
            return; 
        }

        const itemName = nameInput.value.trim();
        const itemStock = parseInt(stockInput.value);
        const itemPrice = parseFloat(priceInput.value);

        if (itemName && itemStock >= 0 && itemPrice > 0) {
            
            const existingItemIndex = inventory.findIndex(item => item.name.toLowerCase() === itemName.toLowerCase());

            if (existingItemIndex !== -1) {
                // Update existing item
                inventory[existingItemIndex].stock += itemStock;
                inventory[existingItemIndex].price = itemPrice; 
            } else {
                // Add new item
                inventory.push({
                    id: Date.now() + itemsProcessed, // Unique ID for new item
                    name: itemName,
                    stock: itemStock,
                    price: itemPrice, // Selling Price
                    addedDate: new Date().toISOString().slice(0, 10)
                });
            }
            itemsProcessed++;
        }
    });

    saveAllData();

    // Clear the form rows and reset the index
    container.innerHTML = '';
    inventoryRowIndex = 0; 
    addInventoryRow(); // Add one blank row back

    renderInventory(); 
    
    alert(`Inventory successfully updated. ${itemsProcessed} items processed.`);
}

// 8. Inventory: Render Stock List (FIXED SALES SELECT POPULATION)
function renderInventory() {
    const list = document.getElementById('inventoryList');
    const saleSelect = document.getElementById('ledgerSaleItemSelect');
    if (!list || !saleSelect) return;

    list.innerHTML = '';
    // Clear and add default option
    saleSelect.innerHTML = '<option value="">Select Item</option>'; 

    inventory.forEach((item, index) => {
        const totalValue = item.stock * item.price;

        // Render to Inventory Stock List
        list.innerHTML += `
            <div class="inventory-row">
                <div>${item.name}</div>
                <div class="align-center">${item.stock}</div>
                <div class="align-right">${formatCurrency(item.price)}</div>
                <div class="align-right">${formatCurrency(totalValue)}</div>
                <div class="align-right">
                    <button onclick="deleteInventoryItem(${index})" class="delete-btn" style="padding: 5px 8px; font-size: 0.8em;"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
        
        // Populate Sales Select Dropdown: VALUE is the unique item.id
        saleSelect.innerHTML += `<option value="${item.id}">${item.name} (Stock: ${item.stock}, Price: ${formatCurrency(item.price)})</option>`;
    });
}

// 9. Inventory: Delete Item
function deleteInventoryItem(index) {
    if (confirm(`Are you sure you want to delete ${inventory[index].name} from inventory?`)) {
        inventory.splice(index, 1);
        saveAllData();
        renderInventory();
        renderSalesLog();
    }
}

// 10. Inventory: Record Sales (Fixed ID search)
function recordLedgerSale() {
    const itemSelect = document.getElementById('ledgerSaleItemSelect');
    const quantity = parseInt(document.getElementById('ledgerSaleQuantity').value);
    const cost = parseFloat(document.getElementById('ledgerSaleCost').value);

    // Basic Validation
    if (!itemSelect.value || quantity <= 0 || cost <= 0) {
        alert("Please select an item and enter valid quantity and unit cost.");
        return;
    }

    const itemId = parseInt(itemSelect.value);
    const itemIndex = inventory.findIndex(item => item.id === itemId); 

    if (itemIndex === -1) {
        alert("Selected item not found in inventory. Please refresh and try again.");
        return;
    }
    
    const item = inventory[itemIndex];
    if (item.stock < quantity) {
        alert(`Insufficient stock. Only ${item.stock} units of ${item.name} available.`);
        return;
    }
    
    // --- 1. Deduct Stock ---
    item.stock -= quantity;
    
    const revenue = quantity * item.price; 
    const cogs = quantity * cost;         
    const today = new Date().toISOString().slice(0, 10);

    // --- 2. Record Revenue (Income) ---
    const revenueTransaction = {
        id: Date.now(),
        description: `Sale: ${item.name} (${quantity} units)`,
        amount: revenue,
        type: 'income',
        date: today,
        isSale: true // Tag as a sale transaction for easy filtering
    };

    // --- 3. Record COGS (Expense) ---
    const cogsTransaction = {
        id: Date.now() + 1, // Ensure unique ID
        description: `COGS: ${item.name} (${quantity} units)`,
        amount: cogs,
        type: 'expense',
        date: today,
        isSale: true
    };

    transactions.unshift(revenueTransaction, cogsTransaction); 
    
    saveAllData();

    document.getElementById('ledgerSaleForm').reset();
    updateSummary();
    renderTransactions();
    renderInventory();
    renderSalesLog();

    alert(`Sale recorded! Revenue: ${formatCurrency(revenue)}, COGS: ${formatCurrency(cogs)}, Profit: ${formatCurrency(revenue - cogs)}`);
}

// 11. Inventory: Render Sales Log
function renderSalesLog() {
    const list = document.getElementById('salesLogList');
    if (!list) return;

    // Filter for revenue transactions marked as sales
    const salesLog = transactions.filter(t => t.isSale && t.type === 'income');
    
    // Sort by date (newest first)
    const sortedSales = [...salesLog].sort((a, b) => new Date(b.date) - new Date(a.date));

    list.innerHTML = sortedSales.slice(0, 10).map(sale => {
        // Find corresponding COGS (approximation: next transaction by same item/date)
        const cogsTransaction = transactions.find(t => 
            t.description.startsWith('COGS:') && 
            t.date === sale.date && 
            t.id === sale.id + 1
        );

        const revenue = sale.amount;
        const cogs = cogsTransaction ? cogsTransaction.amount : 0;
        const profit = revenue - cogs;
        const descriptionMatch = sale.description.match(/\(([^)]+) units\)/);
        const quantity = descriptionMatch ? descriptionMatch[1] : '?';
        const profitClass = profit >= 0 ? 'income' : 'expense';

        return `
            <li class="transaction-item" style="grid-template-columns: 1.5fr 1fr 1fr 1fr;">
                <div>${sale.description.split(':')[1].split('(')[0].trim()}</div>
                <div class="align-center">${quantity}</div>
                <div class="align-right income">${formatCurrency(revenue)}</div>
                <div class="align-right ${profitClass}">${formatCurrency(profit)}</div>
            </li>
        `;
    }).join('');
}


// --------------------------------------------------------------------------------------
// --- ADDITIONAL FEATURES ---
// --------------------------------------------------------------------------------------

// Dark Mode Toggle Logic
const themeToggle = document.getElementById('themeToggle');
const modeText = document.getElementById('modeText');
const modeIcon = themeToggle ? themeToggle.querySelector('i') : null;

function applySavedTheme() {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        if (modeIcon) modeIcon.className = 'fas fa-sun';
        if (modeText) modeText.textContent = 'Disable Dark Mode';
    }
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');

        if (document.body.classList.contains('dark-mode')) {
            if (modeIcon) modeIcon.className = 'fas fa-sun';
            if (modeText) modeText.textContent = 'Disable Dark Mode';
            localStorage.setItem('theme', 'dark');
        } else {
            if (modeIcon) modeIcon.className = 'fas fa-moon';
            if (modeText) modeText.textContent = 'Enable Dark Mode';
            localStorage.setItem('theme', 'light');
        }
    });
}

// Saving Goals Logic (FIXED: Contribution Logic Included)
function addSavingGoal() {
    const name = document.getElementById('goalName').value;
    const target = parseFloat(document.getElementById('goalTarget').value);
    const current = parseFloat(document.getElementById('goalCurrent').value) || 0;
    const date = document.getElementById('goalDate').value;

    if (!name || target <= 0 || !date) {
        alert("Please ensure Goal Name, Target Amount, and Target Date are valid.");
        return;
    }

    savingGoals.push({
        id: Date.now(), name, target, current, date,
        created: new Date().toISOString().slice(0, 10)
    });

    saveAllData();
    renderGoals();
    document.getElementById('goalForm').reset();
}

function renderGoals() {
    const list = document.getElementById('goalsList');
    if (!list) return;
    
    list.innerHTML = savingGoals.map((goal, index) => {
        const remaining = goal.target - goal.current;
        const progress = (goal.current / goal.target) * 100;

        return `
            <div class="goal-item" style="margin-bottom: 15px;">
                <h3>${goal.name}</h3>
                <p>Target: ${formatCurrency(goal.target)} | Saved: ${formatCurrency(goal.current)}</p>
                <p>Remaining: <span class="${remaining > 0 ? 'expense' : 'income'}">${formatCurrency(Math.abs(remaining))}</span></p>
                <p>Target Date: ${goal.date}</p>
                
                <div style="height: 10px; background-color: var(--border-color); border-radius: 5px; margin: 5px 0;">
                    <div style="width: ${Math.min(100, progress)}%; height: 100%; background-color: var(--primary-color); border-radius: 5px;"></div>
                </div>
                <p style="font-size: 0.9em;">${progress.toFixed(1)}% Complete</p>
                
                <form onsubmit="event.preventDefault(); contributeToGoal(${index}, this.elements.contributionAmount.value);" style="margin-top: 10px; display: flex; gap: 10px;">
                    <input type="number" name="contributionAmount" required min="0.01" step="0.01" placeholder="Amount to Fund ($)" style="flex-grow: 1;">
                    <button type="submit" class="secondary-btn" style="white-space: nowrap; height: 40px; padding: 5px 10px;">
                        <i class="fas fa-arrow-up"></i> Fund
                    </button>
                    <button type="button" onclick="deleteGoal(${index})" class="delete-btn" style="height: 40px; padding: 5px 10px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </form>
            </div>
        `;
    }).join('');
}

// NEW FUNCTION: Handles the contribution logic
function contributeToGoal(index, amountInput) {
    const contribution = parseFloat(amountInput);

    if (isNaN(contribution) || contribution <= 0) {
        alert("Please enter a valid amount to contribute.");
        return;
    }
    
    const goal = savingGoals[index];
    
    // Check if the contribution will exceed the target
    if (goal.current + contribution > goal.target) {
        alert(`This contribution exceeds the goal target of ${formatCurrency(goal.target)}. Please enter ${formatCurrency(goal.target - goal.current)} or less.`);
        return;
    }

    // 1. Update the Goal
    goal.current += contribution;
    
    // 2. Record as an Expense transaction (Transfer Out)
    const newExpense = {
        id: Date.now(),
        description: `Goal Contribution: ${goal.name}`,
        amount: contribution,
        type: 'expense',
        date: new Date().toISOString().slice(0, 10)
    };
    transactions.unshift(newExpense);

    saveAllData();
    updateSummary();      // Update dashboard balance
    renderTransactions(); // Show the new expense in the list
    renderGoals();        // Update the goal progress
    
    alert(`Successfully contributed ${formatCurrency(contribution)} to ${goal.name}!`);
}


function deleteGoal(index) {
    if (confirm(`Are you sure you want to delete the goal: ${savingGoals[index].name}?`)) {
        savingGoals.splice(index, 1);
        saveAllData();
        renderGoals();
    }
}

// Recurring Payments Logic
function addRecurringEntry() {
    const description = document.getElementById('recurringDescription').value;
    const amount = parseFloat(document.getElementById('recurringAmount').value);
    const type = document.getElementById('recurringType').value;
    const day = parseInt(document.getElementById('recurringDay').value);

    if (!description || amount <= 0 || day < 1 || day > 28 || isNaN(day)) {
        alert("Please fill out all fields correctly. Day must be a number between 1 and 28.");
        return;
    }

    recurringEntries.push({
        id: Date.now(), description, amount, type, day, lastApplied: null
    });

    saveAllData();
    renderRecurring();
    document.getElementById('recurringForm').reset();
}

function renderRecurring() {
    const list = document.getElementById('recurringList');
    if (!list) return;

    list.innerHTML = recurringEntries.map((entry, index) => {
        return `
            <div class="card" style="margin-bottom: 10px;">
                <h3 class="${entry.type}">${entry.description}</h3>
                <p>Amount: ${formatCurrency(entry.amount)} (${entry.type})</p>
                <p>Applies on Day: ${entry.day} of every month</p>
                <button onclick="deleteRecurringEntry(${index})" class="delete-btn" style="margin-top: 10px; padding: 5px 10px;">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
    }).join('');
}

function deleteRecurringEntry(index) {
    if (confirm(`Are you sure you want to delete the recurring entry: ${recurringEntries[index].description}?`)) {
        recurringEntries.splice(index, 1);
        saveAllData();
        renderRecurring();
    }
}

// Calculator Logic
function calculateTime() {
    const goalAmount = parseFloat(document.getElementById('goalAmount').value);
    const monthlySavings = parseFloat(document.getElementById('monthlySavings').value);
    const resultDiv = document.getElementById('result');

    if (goalAmount <= 0 || monthlySavings <= 0) {
        resultDiv.innerHTML = '<p class="expense">Please enter valid positive values for both fields.</p>';
        return;
    }

    const months = goalAmount / monthlySavings;
    const years = Math.floor(months / 12);
    const remainingMonths = Math.round(months % 12);

    resultDiv.innerHTML = `
        <h3>Calculation Result</h3>
        <p>It will take approximately:</p>
        <p style="font-size: 1.2em; font-weight: 700; color: var(--primary-color);">
            ${years} years and ${remainingMonths} months
        </p>
        <p>to reach your goal of ${formatCurrency(goalAmount)}.</p>
    `;
}

// Settings Logic
function switchCurrency(newCurrency) {
    currentCurrency = newCurrency;
    localStorage.setItem('currency', newCurrency);
    updateSummary();
    renderTransactions();
    renderGoals();
    renderRecurring();
    renderInventory();
    renderSalesLog();
}

function resetApplication() {
    if (confirm("DANGER! This will permanently delete ALL data (transactions, inventory, goals, notes). Are you absolutely sure?")) {
        localStorage.clear();
        location.reload();
    }
}

// Notes Logic (Auto-Save)
document.addEventListener('DOMContentLoaded', () => {
    const notesArea = document.getElementById('appNotes');
    if (notesArea) {
        notesArea.value = localStorage.getItem('appNotes') || '';
        notesArea.addEventListener('input', () => {
            localStorage.setItem('appNotes', notesArea.value);
        });
    }
});


// --- INITIALIZATION AND VIEW SWITCHING ---
document.addEventListener('DOMContentLoaded', (event) => {
    
    applySavedTheme();

    // Set currency dropdown to saved value
    const currencySelect = document.getElementById('settingsCurrencySelect');
    if (currencySelect) {
        currencySelect.value = currentCurrency;
    }

    // --- View Switching Logic ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');

    navItems.forEach(item => {
        if (item.getAttribute('data-view')) {
            item.addEventListener('click', function() {
                navItems.forEach(nav => nav.classList.remove('active'));
                views.forEach(view => view.classList.remove('active'));

                this.classList.add('active');

                const targetViewId = this.getAttribute('data-view');
                const targetView = document.getElementById(targetViewId);
                if (targetView) {
                    targetView.classList.add('active');
                }
            });
        }
    });

    // --- INITIAL APP LOAD ---
    updateSummary();
    renderTransactions();
    renderGoals();
    renderRecurring(); 
    renderInventory();
    renderSalesLog();
    addInventoryRow(); // Add one row to the Inventory form on load
});