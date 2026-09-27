import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:stockpilot_mobile/procurement/models/agent_workflow.dart';
import 'package:stockpilot_mobile/procurement/services/procurement_api_service.dart';
import 'package:stockpilot_mobile/shared/services/auth_api_service.dart';

void main() {
  const request = ReorderWorkflowRequest(
    triggerType: 'LowStock',
    productId: '44444444-4444-4444-4444-444444444444',
    branchId: '11111111-1111-1111-1111-111111111111',
    suggestedQuantity: 4,
    candidateSupplierId: '22222222-2222-2222-2222-222222222222',
    quotationId: '33333333-3333-3333-3333-333333333334',
  );

  ProcurementApiService serviceReturning(int status, Object body, List<http.Request> seen) => ProcurementApiService(
        baseUrl: 'http://api.test',
        authHeaders: () => {'Authorization': 'Bearer t'},
        client: MockClient((r) async {
          seen.add(r);
          return http.Response(jsonEncode(body), status);
        }),
      );

  test('starting a workflow posts the contract payload and returns PendingApproval', () async {
    final seen = <http.Request>[];
    final api = serviceReturning(201, {'workflowId': 'wf-1', 'proposalId': 'p-1', 'status': 'PendingApproval', 'errors': []}, seen);

    final result = await api.startReorderWorkflow(request);

    expect(result.isPendingApproval, isTrue);
    expect(result.proposalId, 'p-1');
    expect(seen.single.url.path, '/api/agent-workflows/procurement/start');
    expect(jsonDecode(seen.single.body), {
      'triggerType': 'LowStock',
      'productId': '44444444-4444-4444-4444-444444444444',
      'branchId': '11111111-1111-1111-1111-111111111111',
      'suggestedQuantity': 4,
      'candidateSupplierId': '22222222-2222-2222-2222-222222222222',
      'quotationId': '33333333-3333-3333-3333-333333333334',
      'sourceAgent': 'Manual',
    });
  });

  test('failed checks (422) come back as a result with the reasons, not an exception', () async {
    final api = serviceReturning(422, {
      'workflowId': 'wf-2',
      'proposalId': null,
      'status': 'ChecksFailed',
      'errors': ['Checks failed: business rules failed (NoDuplicateOpenOrder).'],
    }, []);

    final result = await api.startReorderWorkflow(request);

    expect(result.status, 'ChecksFailed');
    expect(result.proposalId, isNull);
    expect(result.errors.single, contains('NoDuplicateOpenOrder'));
  });

  test('a 403 on start is an exception with a readable message', () async {
    final api = ProcurementApiService(baseUrl: 'http://api.test', client: MockClient((_) async => http.Response('', 403)));

    await expectLater(api.startReorderWorkflow(request), throwsA(isA<ProcurementApiException>().having((e) => e.statusCode, 'status', 403)));
  });

  test('workflow status exposes the live proposal status for the initiator', () async {
    final api = serviceReturning(200, {
      'workflowId': 'wf-1',
      'status': 'PendingApproval',
      'approvalStatus': 'Approved',
      'proposalId': 'p-1',
      'proposalStatus': 'Approved',
    }, []);

    final status = await api.getWorkflow('wf-1');

    expect(status.proposalStatus, 'Approved');
    expect(status.approvalStatus, 'Approved');
  });

  test('login sends the identifier as "username", which is the field the API reads', () async {
    late Map<String, dynamic> sent;
    final auth = AuthApiService(
      baseUrl: 'http://api.test',
      client: MockClient((r) async {
        sent = jsonDecode(r.body) as Map<String, dynamic>;
        return http.Response(
          jsonEncode({
            'accessToken': 'jwt',
            'user': {'userId': 'u-1', 'fullName': 'Branch Mgr', 'email': 'branch@stockpilot.local', 'role': 'BranchManager'},
          }),
          200,
        );
      }),
    );

    final result = await auth.login('branch@stockpilot.local', 'pw');

    expect(sent, {'username': 'branch@stockpilot.local', 'password': 'pw'});
    expect(result.user.role, 'BranchManager');
    expect(result.accessToken, 'jwt');
  });
}
