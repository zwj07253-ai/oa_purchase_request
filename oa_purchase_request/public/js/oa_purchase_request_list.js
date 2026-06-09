frappe.listview_settings["OA Purchase Request"] = {
	add_fields: [
		"sync_status",
		"approval_status",
		"purchase_order",
		"oa_logistics_code",
		"process_instance_id",
	],
	custom_filter_configs: [
		{
			fieldname: "apply_date_from",
			label: __("申请开始"),
			fieldtype: "Date",
			is_filter: 1,
		},
		{
			fieldname: "apply_date_to",
			label: __("申请结束"),
			fieldtype: "Date",
			is_filter: 1,
		},
	],
	onload(listview) {
		listview.page.add_action_item(__("关闭"), () => {
			close_selected_oa_purchase_requests(listview);
		});
		patch_apply_date_range_filter(listview);
		patch_oa_logistics_code_click(listview);
	},
	get_indicator(doc) {
		if (doc.sync_status === "Closed") {
			return [__("已关闭"), "gray", "sync_status,=,Closed"];
		}

		if (doc.sync_status === "Purchase Order Created" || doc.purchase_order) {
			return [__("已生成采购订单"), "green", "sync_status,=,Purchase Order Created"];
		}

		if (doc.sync_status === "Failed") {
			return [__("生成失败"), "red", "sync_status,=,Failed"];
		}

		return [__("未生成采购订单"), "orange", "sync_status,=,Pending Purchase Order"];
	},
	formatters: {
		oa_logistics_code(value, df, doc) {
			if (!value) {
				return "";
			}

			return frappe.utils.escape_html(value);
		},
	},
};

function close_selected_oa_purchase_requests(listview) {
	const names = listview.get_checked_items(true);
	if (!names.length) {
		frappe.msgprint(__("请先选择要关闭的记录"));
		return;
	}

	frappe.call({
		method: "oa_purchase_request.oa_purchase_request.oa_purchase_request.close_oa_purchase_requests",
		args: { names },
		freeze: true,
		freeze_message: __("正在关闭..."),
		callback(response) {
			const closed_names = response.message?.names || names;
			const closed_count = response.message?.closed_count || closed_names.length;
			mark_list_rows_closed(listview, closed_names);
			frappe.show_alert({
				message: __("已关闭 {0} 条记录", [closed_count]),
				indicator: "gray",
			});
			listview.clear_checked_items();
			listview.reload();
		},
	});
}

function mark_list_rows_closed(listview, names) {
	const closed_names = new Set(names);
	(listview.data || []).forEach((doc) => {
		if (closed_names.has(doc.name)) {
			doc.sync_status = "Closed";
		}
	});
	listview.render();
}

window.open_oa_logistics_approval = function (event, element) {
	event.preventDefault();
	event.stopPropagation();

	const oa_logistics_code = $(element).data("oa-logistics-code");
	frappe.call({
		method:
			"oa_purchase_request.oa_purchase_request.oa_purchase_request.get_oa_logistics_dingtalk_url",
		args: { oa_logistics_code },
		freeze: true,
		freeze_message: __("正在打开钉钉审批..."),
		callback(response) {
			if (response.message?.dingtalk_url) {
				window.location.href = response.message.dingtalk_url;
			}
		},
	});

	return false;
};

function patch_apply_date_range_filter(listview) {
	if (listview.__oa_apply_date_range_patched) {
		return;
	}

	const get_filters_for_args = listview.get_filters_for_args.bind(listview);
	listview.get_filters_for_args = () => {
		const filters = get_filters_for_args().filter(
			(filter) => !["apply_date_from", "apply_date_to"].includes(filter[1])
		);
		const from_date = listview.page.fields_dict.apply_date_from?.get_value();
		const to_date = listview.page.fields_dict.apply_date_to?.get_value();

		if (from_date && to_date) {
			filters.push([listview.doctype, "apply_date", "between", [from_date, to_date]]);
		} else if (from_date) {
			filters.push([listview.doctype, "apply_date", ">=", from_date]);
		} else if (to_date) {
			filters.push([listview.doctype, "apply_date", "<=", to_date]);
		}

		return filters;
	};
	listview.__oa_apply_date_range_patched = true;
}

function patch_oa_logistics_code_click(listview) {
	if (listview.__oa_logistics_code_click_patched) {
		return;
	}

	const result = listview.$result?.[0] || listview.page?.wrapper?.[0];
	if (!result) {
		return;
	}

	result.addEventListener("click", (event) => {
		if (!event.target.closest(".list-row-col.oa_logistics_code")) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
		return false;
	}, true);
	listview.__oa_logistics_code_click_patched = true;
}
