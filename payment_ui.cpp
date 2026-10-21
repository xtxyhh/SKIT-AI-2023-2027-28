/*
 * Payment UI - standalone C++17 simulated checkout application.
 * Build: g++ -std=c++17 -Wall -Wextra -pedantic "payment ui.cpp" -o payment_ui
 * Demo only: no real payments, card details, or external services are used.
 */
#include <algorithm>
#include <cctype>
#include <iomanip>
#include <iostream>
#include <limits>
#include <string>
#include <vector>
using namespace std;

struct Product { int id; string name; double price; };
struct CartItem { Product product; int quantity; };
struct Transaction {
    int id;
    string customer;
    string method;
    double subtotal;
    double tax;
    double total;
    string status;
};

class PaymentUI {
    vector<Product> products;
    vector<CartItem> cart;
    vector<Transaction> history;
    int nextId = 5001;
    const double taxRate = 0.05;

    static void rule(char c = '-', int width = 60) {
        cout << string(static_cast<size_t>(width), c) << '\n';
    }

    static string readText(const string& prompt, bool required = true) {
        while (true) {
            cout << prompt;
            string value;
            getline(cin, value);
            if (!required || !value.empty()) return value;
            cout << "This field is required.\n";
        }
    }

    static int readInt(const string& prompt, int low, int high) {
        while (true) {
            cout << prompt;
            int value;
            if (cin >> value && value >= low && value <= high) {
                cin.ignore(numeric_limits<streamsize>::max(), '\n');
                return value;
            }
            cout << "Enter a whole number from " << low << " to " << high << ".\n";
            cin.clear();
            cin.ignore(numeric_limits<streamsize>::max(), '\n');
        }
    }

    static bool confirm(const string& prompt) {
        while (true) {
            string answer = readText(prompt + " (y/n): ");
            transform(answer.begin(), answer.end(), answer.begin(),
                      [](unsigned char c) { return static_cast<char>(tolower(c)); });
            if (answer == "y" || answer == "yes") return true;
            if (answer == "n" || answer == "no") return false;
            cout << "Please answer y or n.\n";
        }
    }

    static void money(double amount) {
        cout << "Rs. " << fixed << setprecision(2) << amount;
    }

    void loadProducts() {
        products = {
            {1, "Starter Plan", 299.00},
            {2, "Standard Plan", 599.00},
            {3, "Premium Plan", 999.00},
            {4, "Priority Support", 199.00},
            {5, "Setup Service", 149.00}
        };
    }

    const Product* productById(int id) const {
        for (const auto& product : products)
            if (product.id == id) return &product;
        return nullptr;
    }

    int cartPosition(int id) const {
        for (size_t i = 0; i < cart.size(); ++i)
            if (cart[i].product.id == id) return static_cast<int>(i);
        return -1;
    }

    double subtotal() const {
        double sum = 0.0;
        for (const auto& item : cart)
            sum += item.product.price * item.quantity;
        return sum;
    }

    void browseProducts() const {
        rule();
        cout << left << setw(6) << "ID" << setw(28) << "Product"
             << right << setw(14) << "Price\n";
        rule();
        for (const auto& product : products) {
            cout << left << setw(6) << product.id << setw(28) << product.name;
            cout << right;
            money(product.price);
            cout << '\n';
        }
        rule();
    }

    void addItem() {
        browseProducts();
        int id = readInt("Product ID: ", 1, 100);
        const Product* product = productById(id);
        if (!product) {
            cout << "Product not found.\n";
            return;
        }
        int quantity = readInt("Quantity (1-20): ", 1, 20);
        int position = cartPosition(id);
        if (position >= 0)
            cart[static_cast<size_t>(position)].quantity += quantity;
        else
            cart.push_back({*product, quantity});
        cout << "Added to cart.\n";
    }

    void viewCart() const {
        if (cart.empty()) {
            cout << "Your cart is empty.\n";
            return;
        }

        rule();
        cout << left << setw(6) << "ID" << setw(25) << "Product"
             << right << setw(7) << "Qty" << setw(13) << "Unit price"
             << setw(13) << "Line total\n";
        rule();

        for (const auto& item : cart) {
            cout << left << setw(6) << item.product.id
                 << setw(25) << item.product.name
                 << right << setw(7) << item.quantity;
            money(item.product.price);
            cout << "  ";
            money(item.product.price * item.quantity);
            cout << '\n';
        }

        rule();
        cout << left << setw(38) << "Subtotal" << right;
        money(subtotal());
        cout << '\n' << left << setw(38) << "Estimated tax (5%)" << right;
        money(subtotal() * taxRate);
        cout << '\n' << left << setw(38) << "Estimated total" << right;
        money(subtotal() * (1.0 + taxRate));
        cout << '\n';
        rule();
    }

    void removeItem() {
        if (cart.empty()) {
            cout << "Your cart is empty.\n";
            return;
        }
        viewCart();
        int id = readInt("Product ID to remove: ", 1, 100);
        auto it = find_if(cart.begin(), cart.end(),
                          [id](const CartItem& item) {
                              return item.product.id == id;
                          });
        if (it == cart.end()) {
            cout << "That product is not in the cart.\n";
            return;
        }
        cart.erase(it);
        cout << "Item removed.\n";
    }

    static void printReceipt(const Transaction& transaction) {
        rule('=');
        cout << "                    PAYMENT RECEIPT\n";
        rule('=');
        cout << "Transaction ID : #" << transaction.id << '\n';
        cout << "Customer       : " << transaction.customer << '\n';
        cout << "Method         : " << transaction.method << '\n';
        cout << "Subtotal       : ";
        money(transaction.subtotal);
        cout << "\nTax            : ";
        money(transaction.tax);
        cout << "\nTotal          : ";
        money(transaction.total);
        cout << "\nStatus         : " << transaction.status << '\n';
        rule('=');
    }

    void checkout() {
        if (cart.empty()) {
            cout << "Add an item before checkout.\n";
            return;
        }

        cout << "--- Checkout Review ---\n";
        viewCart();
        string customer = readText("Customer name: ");

        cout << "\nChoose a simulated payment method:\n";
        cout << "1. UPI demo\n2. Card demo\n3. Net banking demo\n4. Cash on delivery demo\n";
        int method = readInt("Payment method: ", 1, 4);
        const vector<string> methods = {
            "UPI (demo)", "Card (demo)", "Net banking (demo)", "Cash on delivery (demo)"
        };

        double base = subtotal();
        double tax = base * taxRate;
        double total = base + tax;

        rule('=');
        cout << "Customer : " << customer << '\n';
        cout << "Method   : " << methods[static_cast<size_t>(method - 1)] << '\n';
        cout << "Subtotal : ";
        money(base);
        cout << "\nTax      : ";
        money(tax);
        cout << "\nTotal    : ";
        money(total);
        cout << "\nThis is a simulation. No real money will be charged.\n";
        rule('=');

        if (!confirm("Confirm simulated payment")) {
            cout << "Checkout cancelled; your cart is unchanged.\n";
            return;
        }

        Transaction transaction{
            nextId++, customer, methods[static_cast<size_t>(method - 1)],
            base, tax, total, "Demo successful"
        };
        history.push_back(transaction);
        cart.clear();
        cout << "Simulated transaction recorded.\n";
        printReceipt(transaction);
    }

    void listTransactions() const {
        if (history.empty()) {
            cout << "No transactions recorded yet.\n";
            return;
        }
        rule();
        cout << left << setw(12) << "ID" << setw(22) << "Customer"
             << setw(22) << "Method" << right << setw(12) << "Total\n";
        rule();
        for (const auto& transaction : history) {
            string name = transaction.customer;
            if (name.size() > 20) name = name.substr(0, 17) + "...";
            cout << left << setw(12) << transaction.id << setw(22) << name
                 << setw(22) << transaction.method << right;
            money(transaction.total);
            cout << '\n';
        }
        rule();
    }

    void findTransaction() const {
        if (history.empty()) {
            cout << "No transactions to search.\n";
            return;
        }
        int id = readInt("Transaction ID: ", 1, numeric_limits<int>::max());
        for (const auto& transaction : history) {
            if (transaction.id == id) {
                printReceipt(transaction);
                return;
            }
        }
        cout << "Transaction not found.\n";
    }

    void showSummary() const {
        double totalValue = 0.0;
        double totalTax = 0.0;
        for (const auto& transaction : history) {
            totalValue += transaction.total;
            totalTax += transaction.tax;
        }
        rule('=');
        cout << "                  PAYMENT SUMMARY\n";
        rule('=');
        cout << "Recorded transactions : " << history.size() << '\n';
        cout << "Recorded demo value   : ";
        money(totalValue);
        cout << "\nEstimated tax total   : ";
        money(totalTax);
        cout << "\nNo real payments were processed.\n";
        rule('=');
    }

    static void showMenu() {
        cout << '\n';
        rule('=');
        cout << "1. Browse products\n";
        cout << "2. Add item to cart\n";
        cout << "3. View cart\n";
        cout << "4. Remove item from cart\n";
        cout << "5. Checkout (simulation)\n";
        cout << "6. Transaction history\n";
        cout << "7. Find transaction\n";
        cout << "8. Payment summary\n";
        cout << "0. Exit\n";
        rule('=');
    }

public:
    PaymentUI() { loadProducts(); }

    void run() {
        cout << "Welcome to Payment UI - a simulated checkout demo.\n";
        bool running = true;
        while (running) {
            showMenu();
            int choice = readInt("Choose an option: ", 0, 8);
            cout << '\n';
            switch (choice) {
                case 1: browseProducts(); break;
                case 2: addItem(); break;
                case 3: viewCart(); break;
                case 4: removeItem(); break;
                case 5: checkout(); break;
                case 6: listTransactions(); break;
                case 7: findTransaction(); break;
                case 8: showSummary(); break;
                case 0:
                    running = false;
                    cout << "Thank you for trying Payment UI.\n";
                    break;
                default:
                    cout << "Invalid option.\n";
                    break;
            }
        }
    }
};

int main() {
    PaymentUI app;
    app.run();
    return 0;
}
