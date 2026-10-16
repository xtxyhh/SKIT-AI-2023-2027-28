/*
 * Booking UI - standalone C++17 console booking demo.
 * Build: g++ -std=c++17 -Wall -Wextra -pedantic "Booking UI.cpp" -o booking_ui
 * Demo only: bookings are stored in memory; no external services are used.
 */
#include <algorithm>
#include <cctype>
#include <iomanip>
#include <iostream>
#include <limits>
#include <string>
#include <vector>

using namespace std;

struct Service {
    int id;
    string name;
    string description;
    double price;
    int duration;
};

struct Booking {
    int reference;
    string customer;
    string email;
    string service;
    string date;
    string time;
    double price;
    bool cancelled;
};

class BookingUI {
    vector<Service> services;
    vector<Booking> bookings;
    int nextReference = 1001;

    static void rule(char c = '-', int width = 62) {
        cout << string(static_cast<size_t>(width), c) << '\n';
    }

    static string lower(string value) {
        transform(value.begin(), value.end(), value.begin(),
                  [](unsigned char c) {
                      return static_cast<char>(tolower(c));
                  });
        return value;
    }

    static string askText(const string& prompt) {
        while (true) {
            cout << prompt;
            string value;
            getline(cin, value);
            if (!value.empty()) return value;
            cout << "This field is required.\n";
        }
    }

    static int askNumber(const string& prompt, int low, int high) {
        while (true) {
            cout << prompt;
            int value;
            if (cin >> value && value >= low && value <= high) {
                cin.ignore(numeric_limits<streamsize>::max(), '\n');
                return value;
            }
            cout << "Enter a number from " << low << " to " << high << ".\n";
            cin.clear();
            cin.ignore(numeric_limits<streamsize>::max(), '\n');
        }
    }

    static bool confirm(const string& prompt) {
        while (true) {
            cout << prompt << " (y/n): ";
            string answer;
            getline(cin, answer);
            answer = lower(answer);
            if (answer == "y" || answer == "yes") return true;
            if (answer == "n" || answer == "no") return false;
            cout << "Please enter y or n.\n";
        }
    }

    void loadServices() {
        services = {
            {1, "Consultation", "Introductory one-to-one session", 499.0, 30},
            {2, "Standard Session", "Regular scheduled appointment", 899.0, 60},
            {3, "Premium Session", "Extended priority appointment", 1499.0, 90},
            {4, "Group Session", "Shared session for a small group", 699.0, 45}
        };
    }

    const Service* getService(int id) const {
        for (const auto& service : services)
            if (service.id == id) return &service;
        return nullptr;
    }

    Booking* getBooking(int reference) {
        for (auto& booking : bookings)
            if (booking.reference == reference) return &booking;
        return nullptr;
    }

    const Booking* getBooking(int reference) const {
        for (const auto& booking : bookings)
            if (booking.reference == reference) return &booking;
        return nullptr;
    }

    void printServices() const {
        rule();
        cout << left << setw(5) << "ID"
             << setw(22) << "Service"
             << right << setw(10) << "Price"
             << setw(10) << "Minutes" << "  Description\n";
        rule();

        for (const auto& service : services) {
            cout << left << setw(5) << service.id
                 << setw(22) << service.name
                 << right << setw(10) << fixed << setprecision(2)
                 << service.price
                 << setw(10) << service.duration
                 << "  " << service.description << '\n';
        }
        rule();
    }

    static void printBooking(const Booking& booking) {
        rule();
        cout << "Reference : #" << booking.reference << '\n';
        cout << "Customer  : " << booking.customer << '\n';
        cout << "Email     : " << booking.email << '\n';
        cout << "Service   : " << booking.service << '\n';
        cout << "Date      : " << booking.date << '\n';
        cout << "Time      : " << booking.time << '\n';
        cout << "Price     : Rs. " << fixed << setprecision(2)
             << booking.price << '\n';
        cout << "Status    : " << (booking.cancelled ? "Cancelled" : "Confirmed")
             << '\n';
        rule();
    }

    void createBooking() {
        printServices();
        int id = askNumber("Choose service ID: ", 1, 4);
        const Service* service = getService(id);
        if (!service) {
            cout << "Service not found.\n";
            return;
        }

        Booking draft{};
        draft.reference = nextReference;
        draft.customer = askText("Customer name: ");
        draft.email = askText("Email address: ");
        draft.service = service->name;
        draft.date = askText("Date (YYYY-MM-DD): ");
        draft.time = askText("Time (e.g. 14:30): ");
        draft.price = service->price;
        draft.cancelled = false;

        cout << "\nReview booking details:\n";
        printBooking(draft);
        if (!confirm("Confirm this booking")) {
            cout << "Booking was not saved.\n";
            return;
        }

        bookings.push_back(draft);
        ++nextReference;
        cout << "Booking created. Reference: #" << draft.reference << '\n';
    }

    void viewBooking() const {
        int reference = askNumber("Booking reference: ", 1,
                                  numeric_limits<int>::max());
        const Booking* booking = getBooking(reference);
        if (!booking) {
            cout << "No booking found for that reference.\n";
            return;
        }
        printBooking(*booking);
    }

    void listBookings() const {
        if (bookings.empty()) {
            cout << "No bookings have been created yet.\n";
            return;
        }

        rule();
        cout << left << setw(10) << "Reference"
             << setw(22) << "Customer"
             << setw(22) << "Service"
             << setw(14) << "Date" << "Status\n";
        rule();

        for (const auto& booking : bookings) {
            string customer = booking.customer;
            string service = booking.service;
            if (customer.size() > 20) customer = customer.substr(0, 17) + "...";
            if (service.size() > 20) service = service.substr(0, 17) + "...";

            cout << left << setw(10) << booking.reference
                 << setw(22) << customer
                 << setw(22) << service
                 << setw(14) << booking.date
                 << (booking.cancelled ? "Cancelled" : "Confirmed") << '\n';
        }
        rule();
        cout << "Total records: " << bookings.size() << '\n';
    }

    void searchByCustomer() const {
        if (bookings.empty()) {
            cout << "There are no bookings to search.\n";
            return;
        }

        string query = lower(askText("Customer name: "));
        bool found = false;
        for (const auto& booking : bookings) {
            if (lower(booking.customer).find(query) != string::npos) {
                printBooking(booking);
                found = true;
            }
        }
        if (!found) cout << "No matching customer bookings found.\n";
    }

    void cancelBooking() {
        int reference = askNumber("Reference to cancel: ", 1,
                                  numeric_limits<int>::max());
        Booking* booking = getBooking(reference);
        if (!booking) {
            cout << "No booking found for that reference.\n";
            return;
        }
        if (booking->cancelled) {
            cout << "This booking is already cancelled.\n";
            return;
        }

        printBooking(*booking);
        if (confirm("Cancel this booking")) {
            booking->cancelled = true;
            cout << "Booking #" << reference << " cancelled.\n";
        } else {
            cout << "No changes made.\n";
        }
    }

    void showSummary() const {
        int confirmed = 0;
        int cancelled = 0;
        double totalValue = 0.0;

        for (const auto& booking : bookings) {
            if (booking.cancelled) {
                ++cancelled;
            } else {
                ++confirmed;
                totalValue += booking.price;
            }
        }

        rule('=');
        cout << "                 BOOKING SUMMARY\n";
        rule('=');
        cout << "Total records      : " << bookings.size() << '\n';
        cout << "Confirmed bookings : " << confirmed << '\n';
        cout << "Cancelled bookings : " << cancelled << '\n';
        cout << "Confirmed value    : Rs. " << fixed << setprecision(2)
             << totalValue << '\n';
        cout << "This demo does not process real payments.\n";
        rule('=');
    }

    static void menu() {
        cout << '\n';
        rule('=');
        cout << "                    BOOKING UI\n";
        rule('=');
        cout << "1. Browse services\n";
        cout << "2. Create booking\n";
        cout << "3. View booking by reference\n";
        cout << "4. List all bookings\n";
        cout << "5. Search by customer\n";
        cout << "6. Cancel booking\n";
        cout << "7. Booking summary\n";
        cout << "0. Exit\n";
        rule('=');
    }

public:
    BookingUI() {
        loadServices();
    }

    void run() {
        cout << "Welcome to Booking UI - a standalone booking demo.\n";
        bool running = true;

        while (running) {
            menu();
            int choice = askNumber("Select an option: ", 0, 7);
            cout << '\n';

            switch (choice) {
                case 1: printServices(); break;
                case 2: createBooking(); break;
                case 3: viewBooking(); break;
                case 4: listBookings(); break;
                case 5: searchByCustomer(); break;
                case 6: cancelBooking(); break;
                case 7: showSummary(); break;
                case 0:
                    running = false;
                    cout << "Thanks for trying Booking UI.\n";
                    break;
                default:
                    cout << "Invalid option.\n";
                    break;
            }
        }
    }
};

int main() {
    BookingUI app;
    app.run();
    return 0;
}
