/*
 * C++ Study Planner - standalone command-line utility.
 * Build: g++ -std=c++17 -Wall -Wextra -pedantic cpp_study_planner.cpp -o cpp_study_planner
 * Data is held in memory for the current run; no other project files are used.
 */
#include <algorithm>
#include <cctype>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <limits>
#include <string>
#include <vector>

using namespace std;

struct Topic {
    int id;
    string title;
    string course;
    int plannedMinutes;
    int studiedMinutes;
    int priority;
    bool completed;
};

struct Session {
    string course;
    string topic;
    int minutes;
    string note;
};

class StudyPlanner {
    vector<Topic> topics;
    vector<Session> sessions;
    int nextId = 1;

    static string lower(string value) {
        transform(value.begin(), value.end(), value.begin(),
                  [](unsigned char c) {
                      return static_cast<char>(tolower(c));
                  });
        return value;
    }

    static void divider(char c = '-', int width = 58) {
        cout << string(static_cast<size_t>(width), c) << '\n';
    }

    static string readText(const string& prompt, bool required = true) {
        while (true) {
            cout << prompt;
            string value;
            getline(cin, value);
            if (!required || !value.empty()) return value;
            cout << "This field cannot be empty.\n";
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
            cout << "Enter a number between " << low << " and " << high
                 << ".\n";
            cin.clear();
            cin.ignore(numeric_limits<streamsize>::max(), '\n');
        }
    }

    static bool askYesNo(const string& prompt) {
        while (true) {
            string answer = lower(readText(prompt + " (y/n): "));
            if (answer == "y" || answer == "yes") return true;
            if (answer == "n" || answer == "no") return false;
            cout << "Please answer y or n.\n";
        }
    }

    Topic* findById(int id) {
        for (Topic& topic : topics)
            if (topic.id == id) return &topic;
        return nullptr;
    }

    static void printHeader() {
        divider();
        cout << left << setw(5) << "ID"
             << setw(25) << "Topic"
             << setw(16) << "Course"
             << right << setw(7) << "Plan"
             << setw(8) << "Done" << '\n';
        divider();
    }

    static void printTopic(const Topic& topic) {
        string title = topic.title;
        string course = topic.course;
        if (title.size() > 23) title = title.substr(0, 20) + "...";
        if (course.size() > 14) course = course.substr(0, 11) + "...";
        cout << left << setw(5) << topic.id
             << setw(25) << title
             << setw(16) << course
             << right << setw(7) << topic.plannedMinutes
             << setw(8) << (topic.completed ? "Yes" : "No") << '\n';
    }

    vector<const Topic*> search(const string& query) const {
        vector<const Topic*> matches;
        string needle = lower(query);
        for (const Topic& topic : topics) {
            if (lower(topic.title).find(needle) != string::npos ||
                lower(topic.course).find(needle) != string::npos) {
                matches.push_back(&topic);
            }
        }
        return matches;
    }

    void display(const vector<const Topic*>& selected) const {
        if (selected.empty()) {
            cout << "No topics found.\n";
            return;
        }
        printHeader();
        for (const Topic* topic : selected) printTopic(*topic);
        divider();
        cout << "Topics displayed: " << selected.size() << '\n';
    }

    void addTopic() {
        Topic topic{};
        topic.id = nextId++;
        topic.title = readText("Topic title: ");
        topic.course = readText("Course name: ");
        topic.plannedMinutes =
            readInt("Planned minutes (1-2000): ", 1, 2000);
        topic.studiedMinutes = 0;
        topic.priority = readInt("Priority (1 low - 5 high): ", 1, 5);
        topic.completed = false;
        topics.push_back(topic);
        cout << "Topic added. Its ID is " << topic.id << ".\n";
    }

    void listTopics() const {
        vector<const Topic*> selected;
        for (const Topic& topic : topics) selected.push_back(&topic);
        display(selected);
    }

    void searchTopics() const {
        string query = readText("Search by topic or course: ");
        display(search(query));
    }

    void toggleCompletion() {
        if (topics.empty()) {
            cout << "Add a topic first.\n";
            return;
        }
        listTopics();
        int id = readInt("Topic ID: ", 1, numeric_limits<int>::max());
        Topic* topic = findById(id);
        if (!topic) {
            cout << "Topic ID not found.\n";
            return;
        }
        topic->completed = !topic->completed;
        cout << topic->title << " marked "
             << (topic->completed ? "complete.\n" : "incomplete.\n");
    }

    void logSession() {
        if (topics.empty()) {
            cout << "Add a topic before logging a session.\n";
            return;
        }
        listTopics();
        int id = readInt("Topic ID studied: ", 1, numeric_limits<int>::max());
        Topic* topic = findById(id);
        if (!topic) {
            cout << "Topic ID not found.\n";
            return;
        }

        int minutes = readInt("Minutes studied (1-1440): ", 1, 1440);
        string note = readText("Note (optional): ", false);
        topic->studiedMinutes += minutes;
        sessions.push_back({topic->course, topic->title, minutes, note});
        cout << "Session recorded.\n";
    }

    void progressSummary() const {
        if (topics.empty()) {
            cout << "No topics available for a summary.\n";
            return;
        }

        int complete = 0;
        int planned = 0;
        int studied = 0;
        int urgent = 0;

        for (const Topic& topic : topics) {
            complete += topic.completed ? 1 : 0;
            planned += topic.plannedMinutes;
            studied += topic.studiedMinutes;
            if (!topic.completed && topic.priority >= 4) ++urgent;
        }

        double percent = 100.0 * complete / static_cast<double>(topics.size());
        divider('=');
        cout << "                 PROGRESS SUMMARY\n";
        divider('=');
        cout << "Total topics          : " << topics.size() << '\n';
        cout << "Completed             : " << complete << '\n';
        cout << "Pending               : " << topics.size() - complete << '\n';
        cout << "Completion            : " << fixed << setprecision(1)
             << percent << "%\n";
        cout << "Planned study minutes : " << planned << '\n';
        cout << "Logged study minutes  : " << studied << '\n';
        cout << "High-priority pending : " << urgent << '\n';

        const int width = 30;
        int filled = static_cast<int>(percent * width / 100.0);
        cout << "Progress bar          : ["
             << string(static_cast<size_t>(filled), '#')
             << string(static_cast<size_t>(width - filled), '.')
             << "]\n";
        divider('=');
    }

    void priorityList() const {
        vector<const Topic*> pending;
        for (const Topic& topic : topics)
            if (!topic.completed) pending.push_back(&topic);

        sort(pending.begin(), pending.end(),
             [](const Topic* a, const Topic* b) {
                 if (a->priority != b->priority)
                     return a->priority > b->priority;
                 return a->plannedMinutes < b->plannedMinutes;
             });
        cout << "Pending topics, highest priority first:\n";
        display(pending);
    }

    void sessionHistory() const {
        if (sessions.empty()) {
            cout << "No sessions have been logged.\n";
            return;
        }

        divider();
        cout << left << setw(5) << "#"
             << setw(22) << "Course"
             << setw(23) << "Topic"
             << right << setw(8) << "Minutes" << '\n';
        divider();

        int total = 0;
        for (size_t i = 0; i < sessions.size(); ++i) {
            const Session& session = sessions[i];
            string course = session.course;
            string title = session.topic;
            if (course.size() > 20) course = course.substr(0, 17) + "...";
            if (title.size() > 21) title = title.substr(0, 18) + "...";
            cout << left << setw(5) << i + 1
                 << setw(22) << course
                 << setw(23) << title
                 << right << setw(8) << session.minutes << '\n';
            total += session.minutes;
        }
        divider();
        cout << "Sessions: " << sessions.size()
             << " | Total minutes: " << total << '\n';
    }

    void courseSummary() const {
        if (topics.empty()) {
            cout << "No courses available.\n";
            return;
        }

        vector<string> courses;
        for (const Topic& topic : topics) {
            if (find(courses.begin(), courses.end(), topic.course) == courses.end())
                courses.push_back(topic.course);
        }

        divider();
        cout << left << setw(25) << "Course"
             << right << setw(9) << "Topics"
             << setw(12) << "Completed"
             << setw(12) << "Minutes" << '\n';
        divider();

        for (const string& course : courses) {
            int count = 0;
            int complete = 0;
            int minutes = 0;
            for (const Topic& topic : topics) {
                if (topic.course == course) {
                    ++count;
                    complete += topic.completed ? 1 : 0;
                    minutes += topic.studiedMinutes;
                }
            }
            string label = course;
            if (label.size() > 23) label = label.substr(0, 20) + "...";
            cout << left << setw(25) << label
                 << right << setw(9) << count
                 << setw(12) << complete
                 << setw(12) << minutes << '\n';
        }
        divider();
    }

    void removeTopic() {
        if (topics.empty()) {
            cout << "There are no topics to remove.\n";
            return;
        }
        listTopics();
        int id = readInt("Topic ID to remove: ", 1, numeric_limits<int>::max());
        auto it = find_if(topics.begin(), topics.end(),
                          [id](const Topic& topic) {
                              return topic.id == id;
                          });
        if (it == topics.end()) {
            cout << "Topic ID not found.\n";
            return;
        }
        if (!askYesNo("Remove \"" + it->title + "\"?")) {
            cout << "Removal cancelled.\n";
            return;
        }
        string title = it->title;
        topics.erase(it);
        cout << "Removed: " << title << '\n';
    }

    void exportReport() const {
        string filename = readText("Output filename (e.g. study_report.txt): ");
        if (filename.empty()) {
            cout << "Filename cannot be empty.\n";
            return;
        }

        ofstream file(filename);
        if (!file) {
            cout << "Could not open output file.\n";
            return;
        }

        int completed = 0;
        int planned = 0;
        int studied = 0;
        for (const Topic& topic : topics) {
            completed += topic.completed ? 1 : 0;
            planned += topic.plannedMinutes;
            studied += topic.studiedMinutes;
        }

        file << "C++ STUDY PLANNER REPORT\n";
        file << "========================\n\n";
        file << "Topics: " << topics.size() << '\n';
        file << "Completed: " << completed << '\n';
        file << "Pending: " << topics.size() - completed << '\n';
        file << "Planned minutes: " << planned << '\n';
        file << "Studied minutes: " << studied << "\n\n";
        file << "TOPIC DETAILS\n-------------\n";

        for (const Topic& topic : topics) {
            file << "ID: " << topic.id << '\n';
            file << "Title: " << topic.title << '\n';
            file << "Course: " << topic.course << '\n';
            file << "Priority: " << topic.priority << '\n';
            file << "Planned minutes: " << topic.plannedMinutes << '\n';
            file << "Studied minutes: " << topic.studiedMinutes << '\n';
            file << "Status: " << (topic.completed ? "Complete" : "Pending")
                 << "\n\n";
        }

        file << "SESSION HISTORY\n---------------\n";
        for (size_t i = 0; i < sessions.size(); ++i) {
            const Session& session = sessions[i];
            file << i + 1 << ". " << session.course << " / "
                 << session.topic << " - " << session.minutes << " minutes\n";
            if (!session.note.empty()) file << "   Note: " << session.note << '\n';
        }

        file.close();
        if (file) cout << "Report saved to " << filename << ".\n";
        else cout << "There was a problem writing the report.\n";
    }

    static void menu() {
        divider('=');
        cout << "                 C++ STUDY PLANNER\n";
        divider('=');
        cout << " 1. Add topic\n";
        cout << " 2. List all topics\n";
        cout << " 3. Search topics\n";
        cout << " 4. Toggle completion\n";
        cout << " 5. Log study session\n";
        cout << " 6. Progress summary\n";
        cout << " 7. Pending topics by priority\n";
        cout << " 8. Study session history\n";
        cout << " 9. Course summary\n";
        cout << "10. Export text report\n";
        cout << "11. Remove topic\n";
        cout << " 0. Exit\n";
        divider('=');
    }

public:
    void run() {
        cout << "Welcome! Organize your learning one topic at a time.\n";
        bool running = true;
        while (running) {
            menu();
            int choice = readInt("Choose an option: ", 0, 11);
            cout << '\n';

            switch (choice) {
                case 1: addTopic(); break;
                case 2: listTopics(); break;
                case 3: searchTopics(); break;
                case 4: toggleCompletion(); break;
                case 5: logSession(); break;
                case 6: progressSummary(); break;
                case 7: priorityList(); break;
                case 8: sessionHistory(); break;
                case 9: courseSummary(); break;
                case 10: exportReport(); break;
                case 11: removeTopic(); break;
                case 0:
                    running = false;
                    cout << "Keep learning. Goodbye!\n";
                    break;
                default:
                    cout << "Invalid menu option.\n";
            }
            if (running) cout << '\n';
        }
    }
};

int main() {
    StudyPlanner planner;
    planner.run();
    return 0;
}
