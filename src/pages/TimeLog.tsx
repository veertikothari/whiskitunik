import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

interface TimeLogEntry {
  date: string;
  hours?: number; // Optional for older data
  minutes?: number; // Optional for newer data
  userId: string;
}

interface Task {
  id: string;
  timeLogs?: TimeLogEntry[];
}

interface User {
  id: string;
  name: string;
}

interface UserEfficiency {
  userId: string;
  name: string;
  totalMinutes: number;
  taskCount: number;
  avgMinutesPerTask: number;
}

export function TimeLog() {
  const [efficiencyData, setEfficiencyData] = useState<UserEfficiency[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEfficiencyData = async () => {
      try {
        // Fetch users to map IDs to names
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsers(usersList);

        // Fetch tasks and their time logs
        const taskSnap = await getDocs(collection(db, 'tasks'));

        const efficiencyMap: { [userId: string]: { totalMinutes: number; taskCount: number } } = {};

        taskSnap.docs.forEach(docSnap => {
          const task = docSnap.data() as Task;
          const uniqueUsers = new Set<string>();

          task.timeLogs?.forEach(log => {
            const userId = log.userId;
            if (!userId) return; // Skip logs without userId

            // Determine time in minutes (handle hours or minutes fields)
            let timeInMinutes = 0;
            if (typeof log.hours === 'number' && !isNaN(log.hours)) {
              timeInMinutes = log.hours * 60; // Convert hours to minutes
            } else if (typeof log.minutes === 'number' && !isNaN(log.minutes)) {
              timeInMinutes = log.minutes; // Use minutes directly
            } // Else timeInMinutes remains 0 for invalid data

            uniqueUsers.add(userId);

            if (!efficiencyMap[userId]) {
              efficiencyMap[userId] = { totalMinutes: 0, taskCount: 0 };
            }

            efficiencyMap[userId].totalMinutes += timeInMinutes;
          });

          uniqueUsers.forEach(userId => {
            efficiencyMap[userId].taskCount += 1;
          });
        });

        const result: UserEfficiency[] = Object.entries(efficiencyMap).map(([userId, data]) => {
          const user = usersList.find(u => u.id === userId);
          return {
            userId,
            name: user ? user.name : userId,
            totalMinutes: parseFloat(data.totalMinutes.toFixed(2)),
            taskCount: data.taskCount,
            avgMinutesPerTask: data.taskCount > 0 ? parseFloat((data.totalMinutes / data.taskCount).toFixed(2)) : 0,
          };
        });

        setEfficiencyData(result);
      } catch (err) {
        console.error('Error fetching efficiency data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEfficiencyData();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">User Efficiency Report</h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : efficiencyData.length === 0 ? (
        <p className="text-gray-500">No time logs found.</p>
      ) : (
        <>
          {/* Bar Chart */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Total Minutes by User</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={efficiencyData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => [`${value} minutes`, undefined]} />
                <Legend />
                <Bar dataKey="totalMinutes" fill="#3b82f6" name="Total Minutes" />
                <Bar dataKey="avgMinutesPerTask" fill="#10b981" name="Avg Minutes/Task" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table Summary */}
          <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-3 border">User Name</th>
                  <th className="p-3 border">Total Minutes</th>
                  <th className="p-3 border">Tasks Involved</th>
                  <th className="p-3 border">Avg Minutes / Task</th>
                </tr>
              </thead>
              <tbody>
                {efficiencyData.map(user => (
                  <tr key={user.userId} className="hover:bg-gray-50">
                    <td className="p-3 border">{user.name}</td>
                    <td className="p-3 border">{user.totalMinutes}</td>
                    <td className="p-3 border">{user.taskCount}</td>
                    <td className="p-3 border">{user.avgMinutesPerTask}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}