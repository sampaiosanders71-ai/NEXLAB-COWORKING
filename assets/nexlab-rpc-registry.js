(function(root){
  'use strict';

  const READ_ONLY=Object.freeze([
      "get_notification_metrics",
      "get_system_health_snapshot",
      "is_admin",
      "is_coord_or_admin",
      "nexlab_can_create_project_v2690",
      "nexlab_can_create_team_v2680",
      "nexlab_can_view_all_teams_v2680",
      "nexlab_check_asset_duplicates_v26130",
      "nexlab_export_security_snapshot_v02653",
      "nexlab_export_sensitive_user_report",
      "nexlab_get_agenda_range_v263040",
      "nexlab_get_asset_history_v26120",
      "nexlab_get_asset_summary_v26130",
      "nexlab_get_board_dashboard_feed_v263022",
      "nexlab_get_booking_details_v26160",
      "nexlab_get_dashboard_bundle_v02656",
      "nexlab_get_dashboard_summary_v2690",
      "nexlab_get_database_health_v02682",
      "nexlab_get_general_report_v26320",
      "nexlab_get_health_observability_v26220",
      "nexlab_get_homologation_diagnostics_v02667",
      "nexlab_get_homologation_diagnostics_v02682",
      "nexlab_get_meeting_responses_v263038",
      "nexlab_get_my_day_approvals_v1",
      "nexlab_get_my_day_communication_v1",
      "nexlab_get_my_day_meetings_v1",
      "nexlab_get_my_day_summary_v1",
      "nexlab_get_operational_bookings_v26312",
      "nexlab_get_operational_report_v26350",
      "nexlab_get_pending_center_v2702",
      "nexlab_get_pending_center_v2703",
      "nexlab_get_permission_matrix",
      "nexlab_get_permission_matrix_v02652",
      "nexlab_get_privacy_status",
      "nexlab_get_interface_settings_v02682",
      "nexlab_get_data_protection_status_v02682",
      "nexlab_get_production_readiness",
      "nexlab_get_release_publish_gate_v02682",
      "nexlab_get_production_snapshots_v26210",
      "nexlab_get_profile_preview_data_v02655",
      "nexlab_get_project_workspace_v2690",
      "nexlab_get_projects_report_v2690",
      "nexlab_get_report_export_history",
      "nexlab_get_reports_overview_v26350",
      "nexlab_get_sensitive_user_profile_v2700",
      "nexlab_get_team_tasks_v1",
      "nexlab_get_team_workspace_v2680",
      "nexlab_get_teams_report_v2681",
      "nexlab_get_validation_cycle_v02657",
      "nexlab_global_search_v02628",
      "nexlab_has_approved_access",
      "nexlab_has_effective_permission_v2680",
      "nexlab_has_permission_v26100",
      "nexlab_has_project_permission_v2690",
      "nexlab_is_admin",
      "nexlab_is_admin_v2680",
      "nexlab_is_gestor",
      "nexlab_list_asset_responsibles_v26120",
      "nexlab_list_bookings_v263041",
      "nexlab_list_data_requests",
      "nexlab_list_notifications_v26190",
      "nexlab_list_operational_activity_v02643",
      "nexlab_list_operational_activity_v02676",
      "nexlab_list_operational_activity_v02677",
      "nexlab_list_profiles_visible_v26311",
      "nexlab_notification_summary_v26190",
      "nexlab_notification_history_v02682",
      "nexlab_notification_history_filtered_v02682",
      "nexlab_prepare_project_delete_v2690",
      "nexlab_resolve_booking_target_v26170",
      "nexlab_resolve_notification_target_v02682",
      "nexlab_resolve_notification_target_v26190",
      "nexlab_username_available_v1"
  ]);
  const MUTATING=Object.freeze([
      "nexlab_history_maintenance_v02682",
      "nexlab_deleted_residue_maintenance_v02682",
      "admin_cleanup_system_data",
      "admin_create_channel_test",
      "admin_delete_activity_logs",
      "admin_delete_operational_record",
      "admin_requeue_notification_queue",
      "admin_run_due_reminders",
      "create_test_notification",
      "disable_push_subscription",
      "mark_all_notifications_read",
      "mark_notification_read",
      "nexlab_accept_required_documents",
      "nexlab_admin_finalize_resolved_feedback_delete_v02628",
      "nexlab_admin_manage_profile_v02652",
      "nexlab_admin_mark_feedback_delete_failure_v02628",
      "nexlab_admin_prepare_resolved_feedback_delete_v02628",
      "nexlab_admin_restore_user_permissions_v02655",
      "nexlab_admin_restore_user_permissions_v26264",
      "nexlab_admin_save_role_permissions_v02652",
      "nexlab_admin_save_user_permissions_v02655",
      "nexlab_admin_save_user_permissions_v263036",
      "nexlab_assert_release_publishable_v02682",
      "nexlab_archive_meeting_v26160",
      "nexlab_archive_reservation_v26160",
      "nexlab_archive_team_v2680",
      "nexlab_cancel_meeting_v26160",
      "nexlab_cancel_own_profile_request",
      "nexlab_cancel_reservation_v26160",
      "nexlab_complete_profile_registration_v02652",
      "nexlab_confirm_official_repository_publish_v02657",
      "nexlab_create_project_v2690",
      "nexlab_delete_asset_v26100",
      "nexlab_delete_project_v2690",
      "nexlab_delete_stock_item_v26110",
      "nexlab_ensure_notification_preferences",
      "nexlab_ensure_notification_user_settings",
      "nexlab_ensure_production_snapshot_v26220",
      "nexlab_finish_asset_maintenance_v26120",
      "nexlab_generate_promotion_manifest_v02657",
      "nexlab_manage_data_request",
      "nexlab_manage_feedback_v2690",
      "nexlab_manage_project_link_v2690",
      "nexlab_manage_project_task_v2690",
      "nexlab_manage_team_link_v2680",
      "nexlab_manage_team_task_v1",
      "nexlab_manage_team_member_v2680",
      "nexlab_move_asset_v26120",
      "nexlab_move_project_v2690",
      "nexlab_notification_bulk_action_v2702",
      "nexlab_quarantine_test_profiles",
      "nexlab_record_device_homologation_v02668",
      "nexlab_record_device_homologation_v02682",
      "nexlab_record_own_account_security_event_v02682",
      "nexlab_record_production_snapshot",
      "nexlab_record_report_export",
      "nexlab_respond_meeting_invitation_v263042",
      "nexlab_resubmit_own_profile_request_v02652",
      "nexlab_review_profile_request_v02652",
      "nexlab_review_reservation_v26160",
      "nexlab_save_asset_v26120",
      "nexlab_save_booking_v263116",
      "nexlab_save_interface_settings_v02682",
      "nexlab_save_notification_user_settings_v2702",
      "nexlab_save_stock_item_v26110",
      "nexlab_save_team_v2680",
      "nexlab_set_notification_channel_v2702",
      "nexlab_set_optional_consent",
      "nexlab_start_asset_maintenance_v26120",
      "nexlab_submit_data_request",
      "nexlab_submit_validation_review_v02657",
      "nexlab_update_asset_condition_v26100",
      "nexlab_update_client_incident_v26200",
      "nexlab_update_own_profile",
      "nexlab_update_profile_avatar",
      "nexlab_update_project_v2690",
      "nexlab_upsert_own_sensitive_profile_v02681",
      "retry_notification_delivery",
      "save_push_subscription"
  ]);
  const BACKGROUND=Object.freeze([
      "nexlab_record_client_error",
      "nexlab_record_client_error_v26_7",
      "nexlab_record_client_error_v26_7_4",
      "record_security_audit"
  ]);
  const PREVIEW_NOOP=Object.freeze([
      "nexlab_ensure_notification_preferences",
      "nexlab_ensure_notification_user_settings",
      "nexlab_ensure_production_snapshot_v26220",
      "nexlab_record_client_error",
      "nexlab_record_client_error_v26_7",
      "nexlab_record_client_error_v26_7_4",
      "nexlab_record_device_homologation_v02668",
      "nexlab_record_device_homologation_v02682",
      "nexlab_record_production_snapshot"
  ]);
  const SIMULATED_PERMISSION=Object.freeze([
      "is_admin",
      "is_coord_or_admin",
      "nexlab_can_create_project_v2690",
      "nexlab_can_create_team_v2680",
      "nexlab_can_view_all_teams_v2680",
      "nexlab_has_approved_access",
      "nexlab_has_effective_permission_v2680",
      "nexlab_has_permission_v26100",
      "nexlab_has_project_permission_v2690",
      "nexlab_is_admin",
      "nexlab_is_admin_v2680",
      "nexlab_is_gestor"
  ]);

  const readOnlySet=new Set(READ_ONLY);
  const mutatingSet=new Set(MUTATING);
  const backgroundSet=new Set(BACKGROUND);

  function normalize(name){return String(name||'').trim();}
  function classifyRpc(name){
    const value=normalize(name);
    if(!value)return 'none';
    if(readOnlySet.has(value))return 'read';
    if(backgroundSet.has(value))return 'background';
    if(mutatingSet.has(value))return 'mutation';
    return 'unknown';
  }

  function selfTest(){
    const duplicates=(items)=>items.length-new Set(items).size;
    const overlaps=[
      ...READ_ONLY.filter(name=>mutatingSet.has(name)||backgroundSet.has(name)),
      ...MUTATING.filter(name=>backgroundSet.has(name))
    ];
    const cases=[
      {name:'read_rpc_explicit',ok:classifyRpc('nexlab_get_dashboard_bundle_v02656')==='read'},
      {name:'prepare_feedback_delete_is_mutation',ok:classifyRpc('nexlab_admin_prepare_resolved_feedback_delete_v02628')==='mutation'},
      {name:'telemetry_is_background',ok:classifyRpc('nexlab_record_client_error_v26_7_4')==='background'},
      {name:'unknown_rpc_is_unknown',ok:classifyRpc('nexlab_unknown_mutation')==='unknown'},
      {name:'categories_disjoint',ok:overlaps.length===0},
      {name:'lists_without_duplicates',ok:duplicates(READ_ONLY)===0&&duplicates(MUTATING)===0&&duplicates(BACKGROUND)===0}
    ];
    return Object.freeze({
      ok:cases.every(item=>item.ok),
      cases:Object.freeze(cases),
      counts:Object.freeze({read:READ_ONLY.length,mutation:MUTATING.length,background:BACKGROUND.length,previewNoop:PREVIEW_NOOP.length,simulatedPermission:SIMULATED_PERMISSION.length}),
      overlaps:Object.freeze(overlaps)
    });
  }

  const registry=Object.freeze({
    version:'0.26.82',
    policy:'explicit-default-mutation',
    readOnly:READ_ONLY,
    mutating:MUTATING,
    background:BACKGROUND,
    previewNoop:PREVIEW_NOOP,
    simulatedPermission:SIMULATED_PERMISSION,
    classifyRpc,
    isKnownRpc:(name)=>classifyRpc(name)!=='unknown'&&classifyRpc(name)!=='none',
    selfTest
  });

  try{Object.defineProperty(root,'__NEXLAB_RPC_REGISTRY__',{value:registry,enumerable:true,configurable:false,writable:false});}
  catch{root.__NEXLAB_RPC_REGISTRY__=registry;}
})(typeof self!=='undefined'?self:globalThis);
