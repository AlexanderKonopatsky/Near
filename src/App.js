import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as nearAPI from 'near-api-js';

const contractName = 'lottery023586921.near';
const appKeyPrefix = 'near_app';

function UserList({ users }) {
  if (users.length === 0) {
    return (
      <div className="mt-8 bg-gray-700 rounded-2xl p-6 shadow-inner">
        <h2 className="text-xl font-semibold mb-4 text-blue-400">User Balances</h2>
        <p className="text-gray-300">No users data available.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 bg-gray-700 rounded-2xl p-6 shadow-inner">
      <h2 className="text-xl font-semibold mb-4 text-blue-400">User Balances</h2>
      <div className="max-h-60 overflow-y-auto">
        {users.map((user, index) => (
          <div key={index} className="flex justify-between items-center mb-2 py-2 border-b border-gray-600 last:border-b-0">
            <span className="text-gray-300 truncate" style={{maxWidth: '60%'}}>{user.accountId}</span>
            <span className="font-semibold text-green-400">{nearAPI.utils.format.formatNearAmount(user.balance, 4)} NEAR</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NearDApp() {
  const [walletConnection, setWalletConnection] = useState(null);
  const [contract, setContract] = useState(null);
  const [accountId, setAccountId] = useState('');
  const [balance, setBalance] = useState('0');
  const [totalDeposits, setTotalDeposits] = useState('0');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [notification, setNotification] = useState({ message: '', isSuccess: true });
  const [users, setUsers] = useState([]);

  useEffect(() => {
    initNear();
  }, []);

  useEffect(() => {
    if (contract) {
      updateUsers();
    }
  }, [contract]);

  useEffect(() => {
    console.log("Users state updated:", users);
  }, [users]);

  async function initNear() {
    try {
      const near = await nearAPI.connect({
        networkId: 'mainnet',
        nodeUrl: 'https://rpc.mainnet.near.org',
        walletUrl: 'https://app.mynearwallet.com/',
        deps: { keyStore: new nearAPI.keyStores.BrowserLocalStorageKeyStore() },
      });
  
      const walletConnection = new nearAPI.WalletConnection(near, appKeyPrefix);
      setWalletConnection(walletConnection);
  
      if (walletConnection.isSignedIn()) {
        const contract = new nearAPI.Contract(walletConnection.account(), contractName, {
          viewMethods: ['getBalance', 'getTotalDeposits', 'getUsers'],
          changeMethods: ['deposit', 'withdraw'],
        });
        setContract(contract);
        setAccountId(walletConnection.getAccountId());
        await updateBalances(contract, walletConnection.getAccountId());
        await updateUsers();  // Добавьте эту строку
      }
    } catch (error) {
      console.error("Error initializing NEAR:", error);
      showNotification("Error connecting to NEAR. Please check the console for details.", false);
    }
  }

  async function updateBalances(contract, accountId) {
    try {
      const balance = await contract.getBalance({ accountId });
      setBalance(nearAPI.utils.format.formatNearAmount(balance, 4));
  
      const totalDeposits = await contract.getTotalDeposits();
      setTotalDeposits(nearAPI.utils.format.formatNearAmount(totalDeposits, 4));
  
      // Добавьте небольшую задержку перед обновлением списка пользователей
      setTimeout(updateUsers, 1000);
    } catch (error) {
      console.error("Error updating balances:", error);
    }
  }

  async function updateUsers() {
    if (contract) {
      try {
        const userList = await contract.getUsers();
        console.log("User list received:", userList);
        setUsers(userList.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance)));
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    }
  }

  async function connect() {
    if (walletConnection) {
      walletConnection.requestSignIn({
        contractId: contractName,
        methodNames: ['deposit', 'withdraw'],
      });
    }
  }

  async function deposit() {
    if (contract && depositAmount) {
      try {
        await contract.deposit({}, "300000000000000", nearAPI.utils.format.parseNearAmount(depositAmount));
        await updateBalances(contract, accountId);
        await updateUsers();  // Добавьте эту строку
        showNotification(`Successfully deposited ${depositAmount} NEAR`, true);
        setDepositAmount('');
      } catch (error) {
        console.error("Error during deposit:", error);
        showNotification("Error during deposit. Please check the console for details.", false);
      }
    }
  }

  async function withdraw() {
    if (contract && withdrawAmount) {
      try {
        await contract.withdraw({ amount: nearAPI.utils.format.parseNearAmount(withdrawAmount) });
        await updateBalances(contract, accountId);
        await updateUsers();  // Добавьте эту строку
        showNotification(`Successfully withdrawn ${withdrawAmount} NEAR`, true);
        setWithdrawAmount('');
      } catch (error) {
        console.error("Error during withdrawal:", error);
        showNotification("Error during withdrawal. Please check the console for details.", false);
      }
    }
  }

  function logout() {
    if (walletConnection) {
      walletConnection.signOut();
      window.location.reload();
    }
  }

  function showNotification(message, isSuccess) {
    setNotification({ message, isSuccess });
    setTimeout(() => setNotification({ message: '', isSuccess: true }), 3000);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-gray-800 rounded-3xl shadow-2xl p-8 max-w-md w-full"
      >
        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">NEAR DApp</h1>
        
        {!accountId ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={connect}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full py-3 px-6 font-semibold hover:from-blue-600 hover:to-purple-700 transition duration-300 shadow-lg"
          >
            Connect to NEAR
          </motion.button>
        ) : (
          <>
            <div className="mb-8 bg-gray-700 rounded-2xl p-6 shadow-inner">
              <p className="text-gray-300 mb-2">Connected Account: <span className="font-semibold text-blue-400">{accountId}</span></p>
              <p className="text-gray-300 mb-2">Total Deposits: <span className="font-semibold text-purple-400">{totalDeposits} NEAR</span></p>
              <p className="text-gray-300">Your Balance: <span className="font-semibold text-green-400">{balance} NEAR</span></p>
            </div>

            <div className="space-y-6 mb-8">
              <div>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Amount to deposit"
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-full py-2 px-4 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition duration-300"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={deposit}
                  className="w-full mt-2 bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-full py-2 px-4 font-semibold hover:from-green-500 hover:to-blue-600 transition duration-300 shadow-lg"
                >
                  Deposit
                </motion.button>
              </div>

              <div>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Amount to withdraw"
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-full py-2 px-4 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition duration-300"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={withdraw}
                  className="w-full mt-2 bg-gradient-to-r from-purple-400 to-pink-500 text-white rounded-full py-2 px-4 font-semibold hover:from-purple-500 hover:to-pink-600 transition duration-300 shadow-lg"
                >
                  Withdraw
                </motion.button>
              </div>
            </div>

            <UserList users={users} />

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={logout}
              className="w-full mt-8 bg-gray-700 text-gray-300 rounded-full py-2 px-4 font-semibold hover:bg-gray-600 transition duration-300"
            >
              Logout
            </motion.button>
          </>
        )}

        <AnimatePresence>
          {notification.message && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mt-6 p-4 rounded-xl ${notification.isSuccess ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
            >
              {notification.message}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}