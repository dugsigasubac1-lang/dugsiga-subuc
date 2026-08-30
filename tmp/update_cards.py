with open('src/components/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              
              <div 
                onClick={() => setShowActiveStudentsModal(true)}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all active:scale-[0.99] group"
                title="Guji si aad u aragto ardayda firfircoon (Click to view active enrolled students)"
                id="overview-active-students-card"
              >
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    Active Students
                    <span className="text-[10px] text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md">View 🔍</span>
                  </p>
                  <p className="text-2xl lg:text-3xl font-extrabold text-slate-900 mt-2">{activeStudents.length}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Enrolled students</p>
                </div>
                <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                  <UserCheck className="w-6 h-6" />
                </div>
              </div>

              <div 
                onClick={() => {
                  setParentsModalStatusFilter('all');
                  setParentsModalSessionFilter('all');
                  setParentsModalSearchQuery('');
                  setShowParentsModal(true);
                }}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all active:scale-[0.99] group"
                title="Guji si aad u aragto dhammaan waalidiinta iyo xaaladdooda (Click to view all parents & status)"
                id="overview-parents-card"
              >
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    Parents (Waalidiinta)
                    <span className="text-[10px] text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold bg-indigo-50 px-1.5 py-0.5 rounded-md">View 🔍</span>
                  </p>
                  <p className="text-2xl lg:text-3xl font-extrabold text-indigo-700 mt-2">{allParentsWithStatus.length}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    <strong className="text-emerald-600 font-bold">{allParentsWithStatus.filter(p => p.status === 'Active').length} Active</strong> • {allParentsWithStatus.filter(p => p.status === 'Suspended').length} Suspended
                  </p>
                </div>
                <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div 
                onClick={() => setShowTuitionInvoicedModal(true)}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-emerald-300 transition-all active:scale-[0.99] group"
                title="Guji si aad u aragto kashifida lacagta waxbarashada ee ardayda (Click to view expected student tuition dues)"
              >
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    Tuition Invoiced
                    <span className="text-[10px] text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md">Details 🔍</span>
                  </p>
                  <p className="text-2xl lg:text-3xl font-extrabold text-emerald-700 mt-2">${Number(currentMonthTuitionInvoiced).toFixed(2)}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Expected student fees ({currentMonthName})</p>
                </div>
                <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                  <BookOpen className="w-6 h-6" />
                </div>
              </div>

              <div 
                onClick={() => setShowBusInvoicedModal(true)}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-sky-300 transition-all active:scale-[0.99] group"
                title="Guji si aad u aragto faahfaahinta kashifida baska (Click to view expected bus dues)"
              >
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    Bus Invoiced
                    <span className="text-[10px] text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold bg-sky-50 px-1.5 py-0.5 rounded-md">Details 🔍</span>
                  </p>
                  <p className="text-2xl lg:text-3xl font-extrabold text-sky-700 mt-2">${Number(currentMonthBusInvoiced).toFixed(2)}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Expected bus fare ({currentMonthName})</p>
                </div>
                <div className="p-3.5 bg-sky-50 text-sky-600 rounded-2xl group-hover:bg-sky-600 group-hover:text-white transition-colors shrink-0">
                  <Bus className="w-6 h-6" />
                </div>
              </div>

              <div 
                onClick={() => setShowCollectedFeesBreakdownMonth(currentMonthFilter)}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-teal-200 transition-all active:scale-[0.99] group" 
                id="overview-revenue-paid"
                title="Guji si aad u aragto halka ay lacagtu ka timid (Click to view breakdown)"
              >
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    Collected Fees
                    <span className="text-[10px] text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold bg-teal-50 px-1.5 py-0.5 rounded-md">Details 🔍</span>
                  </p>
                  <p className="text-2xl lg:text-3xl font-extrabold text-teal-700 mt-2">${Number(currentMonthPaidAmount).toFixed(2)}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Total deposited ({currentMonthName})</p>
                </div>
                <div className="p-3.5 bg-teal-50 text-teal-600 rounded-2xl group-hover:bg-teal-600 group-hover:text-white transition-colors shrink-0">
                  <CircleDollarSign className="w-6 h-6" />
                </div>
              </div>

              <div 
                onClick={() => setShowPendingFeesBreakdownMonth(currentMonthFilter)}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-rose-200 transition-all active:scale-[0.99] group" 
                id="overview-revenue-unpaid"
                title="Guji si aad u aragto ardayda aan bixin lacagta (Click to see students who haven't paid fees)"
              >
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    Pending Balance
                    <span className="text-[10px] text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold bg-rose-50 px-1.5 py-0.5 rounded-md">Unpaid 🔍</span>
                  </p>
                  <p className="text-2xl lg:text-3xl font-extrabold text-rose-600 mt-2">${Number(currentMonthUnpaidAmount).toFixed(2)}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Outstanding dues ({currentMonthName})</p>
                </div>
                <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl group-hover:bg-rose-600 group-hover:text-white transition-colors shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
              </div>

            </div>'''

replacement = '''            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
              
              {/* 1. Active Students Card */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setShowActiveStudentsModal(true)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowActiveStudentsModal(true); }}
                className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-emerald-500 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98] group flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                title="Guji si aad u aragto liiska ardayda firfircoon (Click to view active enrolled students)"
                id="overview-active-students-card"
              >
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    Active Students
                    <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md group-hover:bg-emerald-600 group-hover:text-white transition-colors">Kormeer 🔍</span>
                  </p>
                  <p className="text-2xl lg:text-3xl font-black text-slate-900 mt-2 group-hover:text-emerald-700 transition-colors">{activeStudents.length}</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">Ardayda diiwaangashan</p>
                </div>
                <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0 shadow-xs">
                  <UserCheck className="w-6 h-6" />
                </div>
              </div>

              {/* 2. Parents Card */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => {
                  setParentsModalStatusFilter('all');
                  setParentsModalSessionFilter('all');
                  setParentsModalSearchQuery('');
                  setShowParentsModal(true);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowParentsModal(true); }}
                className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-indigo-500 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98] group flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                title="Guji si aad u aragto dhammaan waalidiinta iyo xaaladdooda (Click to view all parents & status)"
                id="overview-parents-card"
              >
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    Parents (Waalidiinta)
                    <span className="text-[10px] text-indigo-700 font-extrabold bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md group-hover:bg-indigo-600 group-hover:text-white transition-colors">Xogta 🔍</span>
                  </p>
                  <p className="text-2xl lg:text-3xl font-black text-indigo-700 mt-2 group-hover:text-indigo-900 transition-colors">{allParentsWithStatus.length}</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">
                    <strong className="text-emerald-600 font-bold">{allParentsWithStatus.filter(p => p.status === 'Active').length} Active</strong> • {allParentsWithStatus.filter(p => p.status === 'Suspended').length} Suspended
                  </p>
                </div>
                <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0 shadow-xs">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              {/* 3. Teachers Card */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setActiveTab('teachers')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveTab('teachers'); }}
                className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-violet-500 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98] group flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                title="Guji si aad u aado qaybta macallimiinta (Click to go to Teachers)"
                id="overview-teachers-card"
              >
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    Teachers (Macallimiinta)
                    <span className="text-[10px] text-violet-700 font-extrabold bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-md group-hover:bg-violet-600 group-hover:text-white transition-colors">Aad ➡️</span>
                  </p>
                  <p className="text-2xl lg:text-3xl font-black text-violet-700 mt-2 group-hover:text-violet-900 transition-colors">{(database.teachers || []).length}</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">Kow iyo toban & macallimiinta dugsiga</p>
                </div>
                <div className="p-3.5 bg-violet-50 text-violet-600 rounded-2xl group-hover:bg-violet-600 group-hover:text-white transition-colors shrink-0 shadow-xs">
                  <GraduationCap className="w-6 h-6" />
                </div>
              </div>

              {/* 4. Classes Card */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setActiveTab('classes')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveTab('classes'); }}
                className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-amber-500 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98] group flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                title="Guji si aad u aado fasallada (Click to go to Classes)"
                id="overview-classes-card"
              >
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    Classes (Fasallada)
                    <span className="text-[10px] text-amber-700 font-extrabold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md group-hover:bg-amber-600 group-hover:text-white transition-colors">Aad ➡️</span>
                  </p>
                  <p className="text-2xl lg:text-3xl font-black text-amber-700 mt-2 group-hover:text-amber-900 transition-colors">{(database.classes || []).length}</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">Fasallada shaqaynaya</p>
                </div>
                <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0 shadow-xs">
                  <Building2 className="w-6 h-6" />
                </div>
              </div>

              {/* 5. Tuition Invoiced Card */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setShowTuitionInvoicedModal(true)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowTuitionInvoicedModal(true); }}
                className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-emerald-500 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98] group flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                title="Guji si aad u aragto kashifida lacagta waxbarashada ee ardayda (Click to view expected student tuition dues)"
                id="overview-tuition-invoiced-card"
              >
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    Tuition Invoiced
                    <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md group-hover:bg-emerald-600 group-hover:text-white transition-colors">Details 🔍</span>
                  </p>
                  <p className="text-2xl lg:text-3xl font-black text-emerald-700 mt-2 font-mono">${Number(currentMonthTuitionInvoiced).toFixed(2)}</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">Lacagta waxbarashada ({currentMonthName})</p>
                </div>
                <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0 shadow-xs">
                  <BookOpen className="w-6 h-6" />
                </div>
              </div>

              {/* 6. Bus Invoiced Card */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setShowBusInvoicedModal(true)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowBusInvoicedModal(true); }}
                className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-sky-500 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98] group flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                title="Guji si aad u aragto faahfaahinta kashifida baska (Click to view expected bus dues)"
                id="overview-bus-invoiced-card"
              >
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    Bus Invoiced
                    <span className="text-[10px] text-sky-700 font-extrabold bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-md group-hover:bg-sky-600 group-hover:text-white transition-colors">Details 🔍</span>
                  </p>
                  <p className="text-2xl lg:text-3xl font-black text-sky-700 mt-2 font-mono">${Number(currentMonthBusInvoiced).toFixed(2)}</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">Fiiga baska ({currentMonthName})</p>
                </div>
                <div className="p-3.5 bg-sky-50 text-sky-600 rounded-2xl group-hover:bg-sky-600 group-hover:text-white transition-colors shrink-0 shadow-xs">
                  <Bus className="w-6 h-6" />
                </div>
              </div>

              {/* 7. Collected Fees Card */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setShowCollectedFeesBreakdownMonth(currentMonthFilter)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowCollectedFeesBreakdownMonth(currentMonthFilter); }}
                className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-teal-500 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98] group flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-teal-500/30" 
                id="overview-revenue-paid"
                title="Guji si aad u aragto halka ay lacagtu ka timid (Click to view breakdown)"
              >
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    Collected Fees
                    <span className="text-[10px] text-teal-700 font-extrabold bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-md group-hover:bg-teal-600 group-hover:text-white transition-colors">Details 🔍</span>
                  </p>
                  <p className="text-2xl lg:text-3xl font-black text-teal-700 mt-2 font-mono">${Number(currentMonthPaidAmount).toFixed(2)}</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">Wadarta la qabtay ({currentMonthName})</p>
                </div>
                <div className="p-3.5 bg-teal-50 text-teal-600 rounded-2xl group-hover:bg-teal-600 group-hover:text-white transition-colors shrink-0 shadow-xs">
                  <CircleDollarSign className="w-6 h-6" />
                </div>
              </div>

              {/* 8. Pending Balance Card */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setShowPendingFeesBreakdownMonth(currentMonthFilter)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowPendingFeesBreakdownMonth(currentMonthFilter); }}
                className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-rose-500 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98] group flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-rose-500/30" 
                id="overview-revenue-unpaid"
                title="Guji si aad u aragto ardayda aan bixin lacagta (Click to see students who haven't paid fees)"
              >
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    Pending Balance
                    <span className="text-[10px] text-rose-700 font-extrabold bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md group-hover:bg-rose-600 group-hover:text-white transition-colors">Unpaid 🔍</span>
                  </p>
                  <p className="text-2xl lg:text-3xl font-black text-rose-600 mt-2 font-mono">${Number(currentMonthUnpaidAmount).toFixed(2)}</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">Lacagaha dhiman ({currentMonthName})</p>
                </div>
                <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl group-hover:bg-rose-600 group-hover:text-white transition-colors shrink-0 shadow-xs">
                  <AlertCircle className="w-6 h-6" />
                </div>
              </div>

            </div>'''

if target in content:
    content = content.replace(target, replacement, 1)
    with open('src/components/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Updated Overview Cards Deck!')
else:
    print('ERROR: Target not found')
