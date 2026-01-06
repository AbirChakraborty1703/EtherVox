# 🛡️ Admin Fraud Detection Dashboard - User Guide

## 📊 Overview

The Admin Dashboard now includes a comprehensive **AI-Powered Fraud Detection System** that helps administrators monitor and identify suspicious voting activities in real-time.

---

## 🎯 Dashboard Features

### 1. **Real-Time Statistics Cards**

Four key metrics displayed at the top:

- **Total Votes Monitored** 🗳️
  - Shows total number of votes analyzed by the fraud detection system
  
- **Unique IP Addresses** 🌐
  - Number of different IP addresses that have cast votes
  
- **Unique Devices** 📱
  - Number of different devices detected
  
- **Suspicious Activities** ⚠️
  - Total count of flagged fraudulent behaviors (highlighted in red)

### 2. **Detection Systems Status** 🤖

Real-time status of all 5 fraud detection systems:

- ✅ **IP Monitoring** - Active
- ✅ **Device Tracking** - Active
- ✅ **Regional Spike** - Active
- ✅ **Temporal Patterns** - Active
- ⚠️ **ML Model** - Training needed (until 50+ votes collected)

### 3. **Flagged Suspicious Activities Table** 🚨

Detailed table showing all detected fraud attempts:

| Column | Description |
|--------|-------------|
| **Type** | IP or DEVICE abuse |
| **Identifier** | Actual IP address or device fingerprint |
| **Vote Count** | Number of votes from this source |
| **Severity** | HIGH (>10 votes) or MEDIUM (3-10 votes) |
| **Voter IDs** | List of voter accounts involved |
| **Action** | Investigate button for detailed analysis |

---

## 🔍 How to Use

### **Step 1: Access Admin Dashboard**
```
http://localhost:8081/admin.html
```
Login with admin credentials.

### **Step 2: View Fraud Dashboard**
The fraud detection dashboard appears at the top of the admin page, above the "Add Candidate" form.

### **Step 3: Monitor Statistics**
- Check the statistics cards for any suspicious numbers
- Red alert card indicates issues found

### **Step 4: Review Flagged Activities**
Scroll to the "Flagged Suspicious Activities" section:

- **Green Message**: ✅ No suspicious activities detected
- **Red Table**: 🚨 Fraudulent activities found

### **Step 5: Investigate Issues**
Click the **Investigate** button next to any flagged entry to:
- Review voting history
- Block IP/Device
- Generate detailed report
- Contact voter for verification

### **Step 6: Auto-Refresh**
- Dashboard auto-refreshes every **30 seconds**
- Manual refresh available with the **Refresh** button

---

## 🎨 Visual Indicators

### Status Colors:
- 🟢 **Green** - Normal/Safe
- 🟡 **Orange** - Warning/Pending
- 🔴 **Red** - Alert/Critical

### Severity Badges:
- **HIGH** (Red) - Critical fraud attempt (>10 votes from same source)
- **MEDIUM** (Orange) - Suspicious activity (3-10 votes)

---

## 📈 Example Scenarios

### Scenario 1: Clean Election
```
✅ Total Votes: 150
✅ Unique IPs: 148
✅ Unique Devices: 145
✅ Suspicious Activities: 0

Message: "No Suspicious Activities Detected"
```

### Scenario 2: IP Abuse Detected
```
⚠️ Total Votes: 150
⚠️ Unique IPs: 120
⚠️ Unique Devices: 145
🚨 Suspicious Activities: 2

Flagged Table Shows:
- IP: 192.168.1.100 | 7 votes | HIGH | Voters: U001, U002, U003
- DEVICE: a1b2c3d4 | 4 votes | MEDIUM | Voters: U005, U006
```

### Scenario 3: Regional Spike
```
🚨 Multiple rapid votes detected from Mumbai region
🚨 12 votes in 2 minutes - Possible coordinated attack
```

---

## 🔧 Admin Actions

When suspicious activity is detected, admins can:

1. **Block IP/Device**
   - Prevent further votes from flagged sources
   - Temporary or permanent blocks

2. **Invalidate Votes**
   - Mark fraudulent votes as invalid
   - Blockchain audit trail maintained

3. **Contact Voters**
   - Reach out for verification
   - Request additional authentication

4. **Generate Reports**
   - Export fraud detection data
   - Share with election commission

5. **Adjust Thresholds**
   - Modify detection sensitivity
   - Customize for different election scales

---

## 🚀 Integration with Blockchain

The fraud detection system works alongside your blockchain voting:

```
Vote Cast → Blockchain Record → Fraud Analysis → Admin Alert
     ↓              ↓                   ↓              ↓
  Immutable    Transparent         AI Detection    Real-time
                                                   Dashboard
```

**Benefits:**
- Fraud detection doesn't affect blockchain immutability
- All fraud alerts are logged separately
- Admins can review and decide on actions
- Transparent audit trail maintained

---

## 📊 API Integration

The dashboard connects to:
```
http://127.0.0.1:8001/anomaly/statistics
http://127.0.0.1:8001/anomaly/flagged-voters
```

**Requirements:**
- FastAPI server must be running
- Anomaly detection system active
- MongoDB and MySQL connected

**Start Services:**
```bash
# Terminal 1: Start FastAPI
cd Database_API
python main.py

# Terminal 2: Start Express
node index.js

# Terminal 3: Start Ganache (if needed)
ganache --port 7545
```

---

## 🎓 Understanding the Metrics

### **Suspicious Activity Threshold:**
- **1-2 votes/IP** - Normal (multiple people, same location)
- **3-5 votes/IP** - Caution (family members, shared network)
- **6+ votes/IP** - 🚨 **HIGH ALERT** (likely fraud)

### **Device Fingerprinting:**
- Tracks: Browser, Screen Size, Timezone, OS
- Creates unique hash for each device
- Detects incognito/private browsing attempts

### **Regional Spikes:**
- Normal: Gradual voting throughout the day
- Spike: 10+ votes/minute from one region
- Indicates: Coordinated bot attacks or voting drives

---

## 🛠️ Troubleshooting

### Dashboard Not Loading?
```bash
# Check API status
curl http://127.0.0.1:8001/anomaly/health

# Expected: {"status":"operational",...}
```

### No Data Showing?
- Ensure votes have been cast
- Check FastAPI server is running
- Verify MongoDB connection

### "Unable to connect" Error?
- Restart FastAPI server
- Check port 8001 is not blocked
- Verify anomaly_detection.py is present

---

## 📱 Mobile Access

Admin dashboard is accessible on mobile devices via local network:
```
http://[YOUR_IP]:8081/admin.html
```

---

## 🔐 Security Notes

1. **Admin Authentication Required**
   - JWT token validation
   - Session timeout after inactivity

2. **Read-Only Dashboard**
   - Fraud data displayed only
   - Actions require separate confirmation

3. **Privacy Compliant**
   - IPs are hashed for storage
   - Voter IDs anonymized in logs
   - GDPR compliant data handling

---

## 📚 Best Practices

1. **Regular Monitoring**
   - Check dashboard every hour during election
   - Set up alerts for suspicious activities

2. **Act Quickly**
   - Investigate flagged activities immediately
   - Block IPs showing clear fraud patterns

3. **Document Everything**
   - Export reports regularly
   - Maintain audit trail
   - Share findings with election commission

4. **Post-Election Review**
   - Analyze fraud patterns
   - Adjust thresholds for next election
   - Train ML model with actual data

---

## 🎉 Summary

The Admin Fraud Detection Dashboard provides:

✅ Real-time monitoring of voting activities
✅ AI-powered fraud detection
✅ Easy-to-understand visualizations
✅ Actionable insights for admins
✅ Seamless integration with blockchain voting
✅ Comprehensive audit trail

**Your election is now protected by enterprise-grade fraud detection!** 🛡️

---

## 📞 Support

For issues or questions:
- View API docs: http://127.0.0.1:8001/docs
- Check health: http://127.0.0.1:8001/anomaly/health
- Test system: Run `test-anomaly-detection.ps1`
