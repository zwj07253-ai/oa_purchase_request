frappe.listview_settings["OA Purchase Request"] = {
	add_fields: ["sync_status", "purchase_order", "oa_logistics_code", "process_instance_id"],
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
		patch_apply_date_range_filter(listview);
	},
	get_indicator(doc) {
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

			return `<a href="#" class="oa-dingtalk-link" data-oa-logistics-code="${frappe.utils.escape_html(
				value
			)}" onclick="return open_oa_logistics_approval(event, this);">
				${frappe.utils.escape_html(value)}
			</a>`;
		},
	},
};

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
