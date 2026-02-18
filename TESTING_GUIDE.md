# EtherVox - Quick Testing Guide for Live Voting Results

## Prerequisites
Before testing, ensure the following services are running:

1. **Ganache** - Local blockchain (Port 7545)
2. **MongoDB** - Database service
3. **Backend API** - FastAPI server (Port 8001)
4. **Express Server** - Web server (Port 8081)

## Step-by-Step Testing Procedure

### 1. Start All Services

Open 4 separate terminal windows:

**Terminal 1 - Ganache:**
```bash
# If using Ganache GUI, just start the application
# Or if using ganache-cli:
ganache-cli --port 7545
```

**Terminal 2 - MongoDB:**
```bash
mongod --dbpath "d:\7th sem jis university\ETHERVOX\Database_API\mongodb_data"
```

**Terminal 3 - Backend API:**
```bash
cd "d:\7th sem jis university\ETHERVOX\Database_API"
python main.py
```

**Terminal 4 - Express Server:**
```bash
cd "d:\7th sem jis university\ETHERVOX"
node index.js
```

### 2. Verify All Services Running

Check each terminal for success messages:

- **Ganache:** Should show "Listening on 127.0.0.1:7545"
- **MongoDB:** Should show "waiting for connections on port 27017"
- **Backend API:** Should show "[OK] MySQL Database connection established" and "[OK] MongoDB Database connection established"
- **Express:** Should show "🚀 EtherVox server running on http://localhost:8081"

### 3. Access the Results Page

Open your web browser and navigate to:
```
http://localhost:8081/result.html
```

### 4. What You Should See

**Initial Load:**
- Loading spinner with message "Loading live election results..."
- List of all candidates from database
- Vote count: 0 for all candidates (if no votes cast yet)
- **LIVE RESULTS** indicator with pulsing red dot
- Text: "Auto-refreshing every 5 seconds"
- Total Votes Cast: 0

**Browser Console Output:**
```
Results page loaded
Web3 and contract initialized successfully with MetaMask
(or: Web3 initialized with Ganache provider)
Found X candidates in database
Total candidates in blockchain: X
Blockchain candidates: [...]
Candidate: [Name], Votes: 0
Auto-refresh started - updating every 5 seconds
```

### 5. Test Live Voting Updates

**Method 1: Cast a Vote Through the UI**
1. Open another tab: `http://localhost:8081/`
2. Login with voter credentials
3. Navigate to voting page
4. Cast a vote for a candidate
5. Switch back to result.html tab
6. Within 5 seconds, you should see:
   - Vote count increment by 1
   - Percentage recalculated
   - Progress bar updated
   - If this is the first vote, "Winner" badge appears

**Method 2: Direct Blockchain Interaction (Advanced)**
1. Open browser console on result.html page
2. Call the vote function directly:
```javascript
// Get accounts
const accounts = await web3.eth.getAccounts();
// Vote for candidate 1
await contract.methods.vote(1).send({ from: accounts[0] });
```
3. Within 5 seconds, results should update automatically

### 6. Verify Auto-Refresh

**In Browser Console:**
Every 5 seconds you should see:
```
Auto-refreshing election results...
Found X candidates in database
Total candidates in blockchain: X
[Updated vote counts]
```

### 7. Test Multiple Votes

Cast multiple votes (from different accounts) and verify:
- [ ] Each vote is counted correctly
- [ ] Percentages add up to 100%
- [ ] Progress bars reflect correct proportions
- [ ] Winner badge appears on candidate with most votes
- [ ] Candidates are sorted by vote count (descending)
- [ ] Total votes shown at top is correct sum

### 8. Test Error Scenarios

**Scenario 1: Backend API Down**
1. Stop the FastAPI server (Ctrl+C in Terminal 3)
2. Refresh result.html
3. Expected: Error message "Failed to fetch candidates from database"

**Scenario 2: Blockchain Connection Lost**
1. Stop Ganache
2. Refresh result.html
3. Expected: Error message "Failed to initialize blockchain connection"

**Scenario 3: No Candidates in Database**
1. Clear MongoDB candidates collection
2. Refresh result.html
3. Expected: "No candidates found in the database"

## Verification Checklist

- [ ] Result page loads without errors
- [ ] All candidates are displayed
- [ ] Vote counts are fetched from blockchain
- [ ] Live indicator is visible and pulsing
- [ ] Auto-refresh works every 5 seconds
- [ ] Casting a vote updates results within 5 seconds
- [ ] Multiple votes are counted correctly
- [ ] Percentages calculate correctly
- [ ] Progress bars animate smoothly
- [ ] Winner badge appears correctly
- [ ] Total votes count is accurate
- [ ] Page works without MetaMask (uses Ganache)
- [ ] Page works with MetaMask installed
- [ ] Console shows no errors
- [ ] Mobile view is responsive

## Expected Performance

| Metric | Expected Value |
|--------|---------------|
| Page Load Time | < 2 seconds |
| Initial Data Fetch | < 3 seconds |
| Auto-Refresh Interval | Every 5 seconds |
| Vote Update Display | Within 5 seconds |
| Blockchain Read | < 1 second |
| MongoDB Query | < 500ms |

## Troubleshooting Common Issues

### Issue: "Failed to load contract ABI file"
**Fix:**
1. Ensure contract is compiled: `truffle compile`
2. Check file exists: `d:\7th sem jis university\ETHERVOX\build\contracts\Voting.json`
3. Verify Express server is serving build directory

### Issue: Vote counts always show 0
**Fix:**
1. Verify contract address in result.js matches deployed contract
2. Check if contract is deployed: `truffle migrate`
3. Verify votes are being recorded: Check Ganache transactions
4. Console log blockchain response for debugging

### Issue: Auto-refresh not working
**Fix:**
1. Check browser console for interval errors
2. Verify backend API is responding
3. Check network tab in browser DevTools
4. Ensure no JavaScript errors blocking execution

### Issue: Candidates not displaying
**Fix:**
1. Verify MongoDB is running and has data
2. Check backend API endpoint: `http://127.0.0.1:8001/api/voting-results`
3. Verify CORS is enabled in backend
4. Check candidates collection: `db.candidates.find()`

### Issue: MetaMask connection failed
**Fix:**
1. This is OK - system will fallback to Ganache
2. If you want MetaMask: Install it and connect to localhost:7545
3. Import Ganache account into MetaMask using private key
4. Refresh page

## Browser Compatibility

Tested and working on:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ✅ Safari 14+ (limited testing)

## API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/voting-results` | GET | Fetch all candidates from MongoDB |
| `/build/contracts/Voting.json` | GET | Load contract ABI |
| `contract.methods.countCandidates()` | CALL | Get total candidates from blockchain |
| `contract.methods.getAllCandidates()` | CALL | Get all candidates with vote counts |

## Next Steps After Testing

If all tests pass:
1. ✅ Mark testing complete
2. ✅ Document any issues found
3. ✅ Deploy to production environment
4. ✅ Monitor live voting event
5. ✅ Gather user feedback

If tests fail:
1. Note the specific failure
2. Check error logs in all terminals
3. Verify configuration settings
4. Consult VOTING_RESULTS_FIX.md for detailed troubleshooting
5. Contact development team if issue persists

## Success Criteria

The feature is working correctly when:
1. ✅ Results page loads within 3 seconds
2. ✅ All candidates are visible
3. ✅ Vote counts update automatically every 5 seconds
4. ✅ Casting a vote reflects in results within 5 seconds
5. ✅ No errors in browser console
6. ✅ Live indicator is pulsing
7. ✅ Progress bars animate correctly
8. ✅ Percentages calculate to 100% total
9. ✅ Winner badge appears on highest vote
10. ✅ System handles multiple concurrent votes

## Contact & Support

For issues or questions:
- Check: VOTING_RESULTS_FIX.md
- Review: Browser console logs
- Check: Backend API logs
- Verify: All services are running
- Test: Network connectivity

---
**Last Updated:** January 28, 2026
**Version:** 1.0.0
**Status:** Ready for Testing
